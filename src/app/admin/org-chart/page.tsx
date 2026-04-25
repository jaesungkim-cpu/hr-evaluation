'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Edit2, Save, X, ArrowLeft, Users } from 'lucide-react';

interface OrgNode {
  id: string;
  name: string;
  level: 'ceo' | '본부' | '실' | '팀';
  leader: Employee | null;
  members: Employee[];
  children: OrgNode[];
  members_for_edit: Employee[];
}

export default function OrgChartPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [editLeaderId, setEditLeaderId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const sessionId = document.cookie.split('; ').find((row) => row.startsWith('session_id='))?.split('=')[1];
      if (!sessionId) { router.push('/'); return; }
      const { data: userData } = await supabase.from('employees').select('*').eq('id', sessionId).single();
      if (!userData || userData.role !== 'admin') { router.push('/dashboard'); return; }
      setUser(userData);
      const { data: employeesData } = await supabase.from('employees').select('*').order('name');
      if (employeesData) { setEmployees(employeesData); }
    } catch (error) { console.error('Failed to load data:', error); } finally { setLoading(false); }
  };

  const orgTree = useMemo(() => {
    if (employees.length === 0) return null;
    const ceoEmp = employees.find((e) => e.title === '대표이사');
    const departmentMap = new Map<string, Employee[]>();
    employees.forEach((emp) => { if (emp.department) { if (!departmentMap.has(emp.department)) departmentMap.set(emp.department, []); departmentMap.get(emp.department)!.push(emp); } });
    const deptNodes: OrgNode[] = [];
    departmentMap.forEach((deptEmps, deptName) => {
      const teamMap = new Map<string | null, Employee[]>();
      deptEmps.forEach((emp) => { const tk = emp.team || null; if (!teamMap.has(tk)) teamMap.set(tk, []); teamMap.get(tk)!.push(emp); });
      const realTeams: OrgNode[] = []; const directTeams: OrgNode[] = [];
      teamMap.forEach((teamEmps, teamName) => {
        if (teamName) {
          const leader = teamEmps.find((e) => ['센터장','실장','팀장'].includes(e.title||''));
          const isReal = teamName.includes('실');
          if (isReal) { realTeams.push({ id:`${deptName}-${teamName}`, name:teamName, level:'실', leader:leader||null, members:teamEmps.filter((e)=>e.title!=='실장'&&e.title!=='센터장'), children:[], members_for_edit:teamEmps }); }
          else { directTeams.push({ id:`${deptName}-${teamName}`, name:teamName, level:'팀', leader:leader||null, members:teamEmps.filter((e)=>e.title!=='팀장'&&e.title!=='센터장'), children:[], members_for_edit:teamEmps }); }
        } else { directTeams.push({ id:`${deptName}-direct`, name:`${deptName} 직속`, level:'팀', leader:null, members:teamEmps, children:[], members_for_edit:teamEmps }); }
      });
      deptNodes.push({ id:deptName, name:deptName, level:'본부', leader:deptEmps.find((e)=>e.title==='본부장')||null, members:deptEmps.filter((e)=>e.title!=='본부장'&&!e.team), children:[...realTeams,...directTeams], members_for_edit:deptEmps });
    });
    return { id:'ceo', name:ceoEmp?.name||'CEO', level:'ceo' as const, leader:ceoEmp||null, members:employees.filter((e)=>!e.department&&e.title!=='대표이사'), children:deptNodes, members_for_edit:employees.filter((e)=>e.title==='대표이사') };
  }, [employees]);

  const toggleExpand = (nodeId: string) => { setExpandedNodes((prev) => { const n = new Set(prev); if(n.has(nodeId)) n.delete(nodeId); else n.add(nodeId); return n; }); };

  const handleEditLeader = async () => {
    if (!editingNode || !editLeaderId) { alert('리더를 선택해주세요'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('employees').update({ department: editingNode.level !== 'ceo' ? editingNode.name : undefined, team: editingNode.level === '팀' ? editingNode.name : undefined, title: editingNode.level === '본부' ? '본부장' : editingNode.level === '실' ? '실장' : '팀장' }).eq('id', editLeaderId);
      if (error) throw error;
      await loadData(); setEditingNode(null); setEditLeaderId(''); alert('리더가 변경되었습니다');
    } catch (error) { console.error('Failed:', error); alert('오류가 발생했습니다'); } finally { setSaving(false); }
  };

  const renderOrgNode = (node: OrgNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0 || node.members.length > 0;
    const indent = depth * 24;
    return (
      <div key={node.id} style={{ marginLeft: indent }}>
        <div className="flex items-center space-x-2 py-2 px-4 rounded-lg hover:bg-light transition group">
          {hasChildren ? <button onClick={() => toggleExpand(node.id)} className="text-secondary hover:text-primary transition">{isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}</button> : <div className="w-5"/>}
          <div className="flex-1 p-3 rounded-lg border-2 border-gray-200 hover:border-secondary transition cursor-pointer" onClick={() => setSelectedNode(node)}>
            <div className="flex items-center justify-between">
              <div className="flex-1"><h3 className="font-bold text-primary">{node.name}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  {node.leader && <div className="flex items-center space-x-1"><span className="font-medium">{node.leader.name}</span><span className="text-xs bg-secondary bg-opacity-10 text-secondary px-2 py-1 rounded">{node.leader.title}</span></div>}
                  {node.members.length > 0 && <div className="flex items-center space-x-1"><Users size={16}/><span>{node.members.length}명</span></div>}
                </div>
              </div>
              {viewMode === 'edit' && <button onClick={(e) => { e.stopPropagation(); setEditingNode(node); setEditLeaderId(node.leader?.id||''); }} className="ml-2 p-2 hover:bg-secondary hover:bg-opacity-10 rounded transition"><Edit2 size={16} className="text-secondary"/></button>}
            </div>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="border-l-2 border-gray-300 ml-6 pl-2 mt-1 space-y-1">
            {node.children.map((child) => renderOrgNode(child, depth + 1))}
            {node.members.length > 0 && <div className="space-y-1 mt-2"><h4 className="text-xs font-bold text-gray-500 uppercase px-6">구성원</h4>{node.members.map((m) => (<div key={m.id} className="px-6 py-2"><div className="p-2 rounded bg-gray-50 border border-gray-200"><span className="text-sm font-medium text-gray-700">{m.name}</span>{m.title && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{m.title}</span>}<span className="ml-2 text-xs text-gray-500">{m.email}</span></div></div>))}</div>}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div><div className="flex items-center space-x-4 mb-4"><Link href="/admin" className="flex items-center space-x-2 text-secondary hover:text-primary transition"><ArrowLeft size={20}/><span>뒤로</span></Link></div><h1 className="text-3xl font-bold text-primary mb-2">조직도</h1><p className="text-gray-600">회사 조직 구조 및 리더십 관리</p></div>
        <div className="flex items-center space-x-2 bg-light rounded-lg p-1"><button onClick={() => setViewMode('view')} className={`px-4 py-2 rounded transition font-medium ${viewMode==='view'?'bg-white text-primary shadow':'text-gray-600 hover:text-primary'}`}>조회</button><button onClick={() => setViewMode('edit')} className={`px-4 py-2 rounded transition font-medium ${viewMode==='edit'?'bg-white text-primary shadow':'text-gray-600 hover:text-primary'}`}>편집</button></div>
      </div>
      <div className="bg-white rounded-lg shadow p-8 mb-8">{orgTree ? <div className="space-y-2">{renderOrgNode(orgTree)}</div> : <div className="text-center py-12"><p className="text-gray-600">조직 데이터를 불러올 수 없습니다</p></div>}</div>
      {selectedNode && !editingNode && (
        <div className="bg-white rounded-lg shadow p-6 mb-8"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-primary">{selectedNode.name} 상세</h2><button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">리더</h3>{selectedNode.leader ? <div className="p-4 bg-secondary bg-opacity-5 border-2 border-secondary rounded-lg"><p className="font-semibold text-primary">{selectedNode.leader.name}</p><p className="text-sm text-gray-600">{selectedNode.leader.email}</p><p className="text-sm text-secondary font-medium mt-2">{selectedNode.leader.title}</p></div> : <p className="text-gray-500">리더 미정</p>}</div><div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">통계</h3><div className="grid grid-cols-2 gap-3"><div className="p-3 bg-light rounded-lg"><p className="text-xs text-gray-600">구성원</p><p className="text-2xl font-bold text-primary">{selectedNode.members.length}</p></div><div className="p-3 bg-light rounded-lg"><p className="text-xs text-gray-600">하위 부서</p><p className="text-2xl font-bold text-primary">{selectedNode.children.length}</p></div></div></div></div>
          {selectedNode.members.length > 0 && <div className="mt-6"><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">직급 구성원</h3><div className="space-y-2">{selectedNode.members.map((m) => (<div key={m.id} className="p-3 bg-light rounded-lg flex items-center justify-between"><div><p className="font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-600">{m.email}</p></div><span className="text-xs bg-white border border-gray-300 px-2 py-1 rounded">{m.title||'직책 없음'}</span></div>))}</div></div>}
        </div>
      )}
      {editingNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between p-6 border-b border-gray-200"><h2 className="text-xl font-bold text-primary">{editingNode.name} 리더 변경</h2><button onClick={() => { setEditingNode(null); setEditLeaderId(''); }} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
          <div className="p-6 space-y-6"><div><label className="block text-sm font-bold text-gray-700 mb-3">새 리더 선택</label><select value={editLeaderId} onChange={(e) => setEditLeaderId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="">-- 선택해주세요 --</option>{employees.filter((e)=>e.id!==editingNode.leader?.id).map((e)=>(<option key={e.id} value={e.id}>{e.name} ({e.title||e.position||'직책없음'}) - {e.email}</option>))}</select></div>
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm text-yellow-800">주의: 이 작업은 선택된 구성원의 부서, 팀, 직책을 변경합니다.</p></div></div>
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200"><button onClick={() => { setEditingNode(null); setEditLeaderId(''); }} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">취소</button><button onClick={handleEditLeader} disabled={saving||!editLeaderId} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"><Save size={16}/><span>{saving?'저장중...':'저장'}</span></button></div>
        </div></div>
      )}
      <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold text-primary mb-4">조직이동 및 겸직</h2><div className="p-6 bg-light rounded-lg border-2 border-gray-300"><p className="text-gray-600 mb-4">조직이동 또는 겸직 관련 의견을 업로드할 수 있습니다. (개발 예정)</p><button disabled className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed">파일 업로드 (미개발)</button></div></div>
    </div>
  );
}
