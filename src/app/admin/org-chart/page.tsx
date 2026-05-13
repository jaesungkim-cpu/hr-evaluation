'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Edit2, Save, X, ArrowLeft, Users, UserPlus, Search } from 'lucide-react';

type EmpEx = Employee & {
  division?: string | null;
  concurrent_org_1?: string | null;
  concurrent_group_1?: string | null;
  concurrent_org_2?: string | null;
  concurrent_group_2?: string | null;
};

interface OrgNode {
  id: string;
  name: string;
  level: 'ceo' | '본부' | '실' | '팀';
  leader: EmpEx | null;
  members: EmpEx[];
  children: OrgNode[];
  members_for_edit: EmpEx[];
}

const GROUP_OPTIONS = ['본부장', '팀장이상', '팀원'];

export default function OrgChartPage() {
  const router = useRouter();
  const [user, setUser] = useState<EmpEx | null>(null);
  const [employees, setEmployees] = useState<EmpEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [editLeaderId, setEditLeaderId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  // Phase3 #3: 겸직 관리 state
  const [concEmpSearch, setConcEmpSearch] = useState('');
  const [concurrentTarget, setConcurrentTarget] = useState<EmpEx | null>(null);
  const [concOrg1, setConcOrg1] = useState('');
  const [concGroup1, setConcGroup1] = useState('');
  const [concOrg2, setConcOrg2] = useState('');
  const [concGroup2, setConcGroup2] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const sessionId = document.cookie.split('; ').find((row) => row.startsWith('session_id='))?.split('=')[1];
      if (!sessionId) { router.push('/'); return; }
      const { data: userData } = await supabase.from('employees').select('*').eq('id', sessionId).single();
      if (!userData || userData.role !== 'admin') { router.push('/dashboard'); return; }
      setUser(userData as EmpEx);
      const { data: employeesData } = await supabase.from('employees').select('*').order('name');
      if (employeesData) { setEmployees(employeesData as EmpEx[]); }
    } catch (error) { console.error('Failed:', error); } finally { setLoading(false); }
  };

  const orgTree = useMemo(() => {
    if (employees.length === 0) return null;
    const ceoEmp = employees.find((e) => e.title === '대표이사');
    const departmentMap = new Map<string, EmpEx[]>();
    employees.forEach((emp) => { if (emp.department) { if (!departmentMap.has(emp.department)) departmentMap.set(emp.department, []); departmentMap.get(emp.department)!.push(emp); } });
    const deptNodes: OrgNode[] = [];
    departmentMap.forEach((deptEmps, deptName) => {
      const divisionMap = new Map<string|null, EmpEx[]>();
      deptEmps.forEach((emp) => { const dk = (emp as any).division || null; if (!divisionMap.has(dk)) divisionMap.set(dk, []); divisionMap.get(dk)!.push(emp); });
      const divisionNodes: OrgNode[] = [];
      Array.from(divisionMap.entries()).filter(([d])=>d!==null).sort(([a],[b])=>(a&&b?a.localeCompare(b):0)).forEach(([divName, divEmps]) => {
        if (!divName) return;
        const teamMap = new Map<string|null, EmpEx[]>();
        divEmps.forEach((emp) => { const tk = emp.team||null; if(!teamMap.has(tk)) teamMap.set(tk,[]); teamMap.get(tk)!.push(emp); });
        const teamNodes: OrgNode[] = [];
        Array.from(teamMap.entries()).filter(([t])=>t!==null).sort(([a],[b])=>(a&&b?a.localeCompare(b):0)).forEach(([teamName, teamEmps]) => {
          if(!teamName) return;
          const tl = teamEmps.find((e)=>e.title==='팀장');
          teamNodes.push({id:`${deptName}-${divName}-${teamName}`,name:teamName,level:'팀',leader:tl||null,members:teamEmps.filter((e)=>e.title!=='팀장'),children:[],members_for_edit:teamEmps});
        });
        const dl = divEmps.find((e) => ['실장','센터장'].includes(e.title||''));
        const dm = divEmps.filter((e) => !e.team && !['실장','센터장'].includes(e.title||''));
        divisionNodes.push({id:`${deptName}-${divName}`,name:divName,level:'실',leader:dl||null,members:dm,children:teamNodes,members_for_edit:divEmps});
      });
      const directEmps = divisionMap.get(null)||[];
      const dtMap = new Map<string|null, EmpEx[]>();
      directEmps.forEach((emp) => { const tk=emp.team||null; if(!dtMap.has(tk)) dtMap.set(tk,[]); dtMap.get(tk)!.push(emp); });
      const directTeamNodes: OrgNode[] = [];
      Array.from(dtMap.entries()).filter(([t])=>t!==null).sort(([a],[b])=>(a&&b?a.localeCompare(b):0)).forEach(([teamName, teamEmps]) => {
        if(!teamName) return;
        const tl = teamEmps.find((e)=>e.title==='팀장');
        directTeamNodes.push({id:`${deptName}-${teamName}`,name:teamName,level:'팀',leader:tl||null,members:teamEmps.filter((e)=>e.title!=='팀장'),children:[],members_for_edit:teamEmps});
      });
      const deptLeader = deptEmps.find((e)=>e.title==='본부장');
      const deptDirectMembers = directEmps.filter((e)=>!e.team&&e.title!=='본부장');
      deptNodes.push({id:deptName,name:deptName,level:'본부',leader:deptLeader||null,members:deptDirectMembers,children:[...divisionNodes,...directTeamNodes],members_for_edit:deptEmps});
    });
    return {id:'ceo',name:ceoEmp?.name||'CEO',level:'ceo' as const,leader:ceoEmp||null,members:employees.filter((e)=>!e.department&&e.title!=='대표이사'),children:deptNodes,members_for_edit:employees.filter((e)=>e.title==='대표이사')};
  }, [employees]);

  // Phase3 #3: 가능한 조직 목록 (본부/실/팀)
  const allOrgs = useMemo(() => {
    const set: Record<string, boolean> = {};
    employees.forEach((e:EmpEx) => {
      if (e.department) set[e.department] = true;
      if (e.division) set[e.division] = true;
      if (e.team) set[e.team] = true;
    });
    return Object.keys(set).sort();
  }, [employees]);

  const openConcurrent = (emp: EmpEx) => {
    setConcurrentTarget(emp);
    setConcOrg1(emp.concurrent_org_1 || '');
    setConcGroup1(emp.concurrent_group_1 || '');
    setConcOrg2(emp.concurrent_org_2 || '');
    setConcGroup2(emp.concurrent_group_2 || '');
  };

  const saveConcurrent = async () => {
    if (!concurrentTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('employees').update({
        concurrent_org_1: concOrg1 || null,
        concurrent_group_1: concGroup1 || null,
        concurrent_org_2: concOrg2 || null,
        concurrent_group_2: concGroup2 || null,
      }).eq('id', concurrentTarget.id);
      if (error) throw error;
      await loadData();
      alert(concurrentTarget.name + '의 겸직 정보가 저장되었습니다.');
      setConcurrentTarget(null);
    } catch (error) { console.error(error); alert('저장 중 오류가 발생했습니다. (DB 컬럼 누락 가능)'); } finally { setSaving(false); }
  };

  const toggleExpand = (nodeId: string) => { setExpandedNodes((prev) => { const n=new Set(prev); if(n.has(nodeId)) n.delete(nodeId); else n.add(nodeId); return n; }); };

  const handleEditLeader = async (node: OrgNode) => {
    if (!editingNode||!editLeaderId) { alert('리더를 선택해주세요'); return; }
    setSaving(true);
    try {
      const updateData: any = { title: editingNode.level==='본부'?'본부장':editingNode.level==='실'?'실장':'팀장' };
      if (editingNode.level==='본부') updateData.department = editingNode.name;
      else if (editingNode.level==='실') updateData.division = editingNode.name;
      else if (editingNode.level==='팀') updateData.team = editingNode.name;
      const { error } = await supabase.from('employees').update(updateData).eq('id', editLeaderId);
      if (error) throw error;
      await loadData(); setEditingNode(null); setEditLeaderId(''); alert('리더가 변경되었습니다');
    } catch (error) { console.error('Failed:', error); alert('오류가 발생했습니다'); } finally { setSaving(false); }
  };

  const renderOrgNode = (node: OrgNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length>0||node.members.length>0;
    const indent = depth*24;
    return (
      <div key={node.id} style={{marginLeft:indent}}>
        <div className="flex items-center space-x-2 py-2 px-4 rounded-lg hover:bg-light transition group">
          {hasChildren ? <button onClick={()=>toggleExpand(node.id)} className="text-secondary hover:text-primary transition">{isExpanded?<ChevronDown size={20}/>:<ChevronRight size={20}/>}</button> : <div className="w-5"/>}
          <div className="flex-1 p-3 rounded-lg border-2 border-gray-200 hover:border-secondary transition cursor-pointer" onClick={()=>setSelectedNode(node)}>
            <div className="flex items-center justify-between">
              <div className="flex-1"><h3 className="font-bold text-primary">{node.name}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  {node.leader&&<div className="flex items-center space-x-1"><span className="font-medium">{node.leader.name}</span><span className="text-xs bg-secondary bg-opacity-10 text-secondary px-2 py-1 rounded">{node.leader.title}</span></div>}
                  {node.members.length>0&&<div className="flex items-center space-x-1"><Users size={16}/><span>{node.members.length}명</span></div>}
                </div>
              </div>
              {viewMode==='edit'&&<button onClick={(e)=>{e.stopPropagation();setEditingNode(node);setEditLeaderId(node.leader?.id||'');}} className="ml-2 p-2 hover:bg-secondary hover:bg-opacity-10 rounded transition"><Edit2 size={16} className="text-secondary"/></button>}
            </div>
          </div>
        </div>
        {isExpanded&&hasChildren&&(
          <div className="border-l-2 border-gray-300 ml-6 pl-2 mt-1 space-y-1">
            {node.children.map((child)=>renderOrgNode(child,depth+1))}
            {node.members.length>0&&<div className="space-y-1 mt-2"><h4 className="text-xs font-bold text-gray-500 uppercase px-6">구성원</h4>{node.members.map((m)=>(<div key={m.id} className="px-6 py-2"><div className="p-2 rounded bg-gray-50 border border-gray-200"><span className="text-sm font-medium text-gray-700">{m.name}</span>{m.title&&<span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{m.title}</span>}<span className="ml-2 text-xs text-gray-500">{m.email}</span></div></div>))}</div>}
          </div>
        )}
      </div>
    );
  };

  if(loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div></div>;
  if(!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>;

  const filteredEmps = employees.filter(e => !concEmpSearch || (e.name||'').toLowerCase().includes(concEmpSearch.toLowerCase()) || (e.department||'').toLowerCase().includes(concEmpSearch.toLowerCase()) || (e.team||'').toLowerCase().includes(concEmpSearch.toLowerCase()));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div><div className="flex items-center space-x-4 mb-4"><Link href="/admin" className="flex items-center space-x-2 text-secondary hover:text-primary transition"><ArrowLeft size={20}/><span>뒤로</span></Link></div><h1 className="text-3xl font-bold text-primary mb-2">조직도</h1><p className="text-gray-600">회사 조직 구조 및 리더십 관리</p></div>
        <div className="flex items-center space-x-2 bg-light rounded-lg p-1"><button onClick={()=>setViewMode('view')} className={`px-4 py-2 rounded transition font-medium ${viewMode==='view'?'bg-white text-primary shadow':'text-gray-600 hover:text-primary'}`}>조회</button><button onClick={()=>setViewMode('edit')} className={`px-4 py-2 rounded transition font-medium ${viewMode==='edit'?'bg-white text-primary shadow':'text-gray-600 hover:text-primary'}`}>편집</button></div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 mb-8">{orgTree?<div className="space-y-2">{renderOrgNode(orgTree)}</div>:<div className="text-center py-12"><p className="text-gray-600">조직 데이터를 불러올 수 없습니다</p></div>}</div>

      {selectedNode&&!editingNode&&(
        <div className="bg-white rounded-lg shadow p-6 mb-8"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-primary">{selectedNode.name} 상세</h2><button onClick={()=>setSelectedNode(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">리더</h3>{selectedNode.leader?<div className="p-4 bg-secondary bg-opacity-5 border-2 border-secondary rounded-lg"><p className="font-semibold text-primary">{selectedNode.leader.name}</p><p className="text-sm text-gray-600">{selectedNode.leader.email}</p><p className="text-sm text-secondary font-medium mt-2">{selectedNode.leader.title}</p></div>:<p className="text-gray-500">리더 미정</p>}</div><div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">통계</h3><div className="grid grid-cols-2 gap-3"><div className="p-3 bg-light rounded-lg"><p className="text-xs text-gray-600">구성원</p><p className="text-2xl font-bold text-primary">{selectedNode.members.length}</p></div><div className="p-3 bg-light rounded-lg"><p className="text-xs text-gray-600">하위부서</p><p className="text-2xl font-bold text-primary">{selectedNode.children.length}</p></div></div></div></div>
          {selectedNode.members.length>0&&<div className="mt-6"><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">직급 구성원</h3><div className="space-y-2">{selectedNode.members.map((m)=>(<div key={m.id} className="p-3 bg-light rounded-lg flex items-center justify-between"><div><p className="font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-600">{m.email}</p></div><div className="flex items-center space-x-2"><span className="text-xs bg-white border border-gray-300 px-2 py-1 rounded">{m.title||'직책없음'}</span><button onClick={()=>openConcurrent(m)} className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-opacity-90"><UserPlus size={12}/><span>겸직</span></button></div></div>))}</div></div>}
        </div>
      )}

      {editingNode&&(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between p-6 border-b border-gray-200"><h2 className="text-xl font-bold text-primary">{editingNode.name} 리더 변경</h2><button onClick={()=>{setEditingNode(null);setEditLeaderId('');}} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
          <div className="p-6 space-y-6"><div><label className="block text-sm font-bold text-gray-700 mb-3">새 리더 선택</label><select value={editLeaderId} onChange={(e)=>setEditLeaderId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="">-- 선택 --</option>{employees.filter((e)=>e.id!==editingNode.leader?.id).map((e)=>(<option key={e.id} value={e.id}>{e.name} ({e.title||'직책없음'}) - {e.email}</option>))}</select></div>
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm text-yellow-800">주의: 이 작업은 선택된 구성원의 부서, 팀, 직책을 변경합니다.</p></div></div>
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200"><button onClick={()=>{setEditingNode(null);setEditLeaderId('');}} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">취소</button><button onClick={()=>handleEditLeader(editingNode)} disabled={saving||!editLeaderId} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"><Save size={16}/><span>{saving?'저장중...':'저장'}</span></button></div>
        </div></div>
      )}

      {/* Phase3 #3: 겸직자 관리 섹션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">겸직자 관리</h2>
          <span className="text-xs text-gray-500">⚠️ 사전에 Supabase employees 테이블에 4개 컬럼 추가 필요 (아래 안내 참고)</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">직원을 검색하여 겸직 조직 및 평가그룹(본부장/팀장이상/팀원)을 지정할 수 있습니다. 최대 2개까지.</p>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-3 text-gray-400"/>
          <input type="text" placeholder="이름, 본부, 팀으로 검색" value={concEmpSearch} onChange={e=>setConcEmpSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/>
        </div>
        <div className="max-h-96 overflow-y-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-light sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">이름</th>
                <th className="px-3 py-2 text-left font-semibold">본 소속</th>
                <th className="px-3 py-2 text-left font-semibold">직책</th>
                <th className="px-3 py-2 text-left font-semibold">겸직 1</th>
                <th className="px-3 py-2 text-left font-semibold">겸직 2</th>
                <th className="px-3 py-2 text-center font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.slice(0, 100).map(emp => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{emp.department}/{emp.team}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{emp.title}</td>
                  <td className="px-3 py-2 text-xs">{emp.concurrent_org_1 ? <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{emp.concurrent_org_1} ({emp.concurrent_group_1})</span> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-3 py-2 text-xs">{emp.concurrent_org_2 ? <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{emp.concurrent_org_2} ({emp.concurrent_group_2})</span> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={()=>openConcurrent(emp)} className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-opacity-90 mx-auto"><UserPlus size={12}/><span>관리</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">최대 100명 표시. 검색으로 좁혀주세요.</p>
      </div>

      {/* 겸직 설정 모달 */}
      {concurrentTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={()=>setConcurrentTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-primary">{concurrentTarget.name} 겸직 설정</h2>
              <button onClick={()=>setConcurrentTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>본 소속:</strong> {concurrentTarget.department || '-'} / {concurrentTarget.team || '-'}</p>
                <p><strong>직책:</strong> {concurrentTarget.title || '-'}</p>
              </div>
              <div className="border-2 border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-bold text-blue-700">겸직 조직 1</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={concOrg1} onChange={e=>setConcOrg1(e.target.value)} className="px-3 py-2 border rounded text-sm">
                    <option value="">조직 선택</option>
                    {allOrgs.map(o=>(<option key={o} value={o}>{o}</option>))}
                  </select>
                  <select value={concGroup1} onChange={e=>setConcGroup1(e.target.value)} className="px-3 py-2 border rounded text-sm">
                    <option value="">평가그룹 선택</option>
                    {GROUP_OPTIONS.map(g=>(<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
              </div>
              <div className="border-2 border-purple-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-bold text-purple-700">겸직 조직 2 (선택사항)</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={concOrg2} onChange={e=>setConcOrg2(e.target.value)} className="px-3 py-2 border rounded text-sm">
                    <option value="">조직 선택</option>
                    {allOrgs.map(o=>(<option key={o} value={o}>{o}</option>))}
                  </select>
                  <select value={concGroup2} onChange={e=>setConcGroup2(e.target.value)} className="px-3 py-2 border rounded text-sm">
                    <option value="">평가그룹 선택</option>
                    {GROUP_OPTIONS.map(g=>(<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">※ 모든 항목을 비워두고 저장하면 겸직이 해제됩니다.</p>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button onClick={()=>setConcurrentTarget(null)} className="px-4 py-2 border rounded text-sm">취소</button>
              <button onClick={saveConcurrent} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded text-sm disabled:opacity-50 hover:bg-opacity-90"><Save size={14}/><span>{saving?'저장 중...':'저장'}</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
