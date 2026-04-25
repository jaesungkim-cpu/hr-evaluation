'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';
import Link from 'next/link';
import { Upload, Plus, X, Save, GitBranch } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const sessionId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_id='))
        ?.split('=')[1];
      if (!sessionId) { router.push('/'); return; }
      const { data: userData } = await supabase.from('employees').select('*').eq('id', sessionId).single();
      if (!userData || userData.role !== 'admin') { router.push('/dashboard'); return; }
      setUser(userData);
      const { data: employeesData } = await supabase.from('employees').select('*').order('name');
      if (employeesData) { setEmployees(employeesData); }
    } catch (error) { console.error('Failed to load admin data:', error); } finally { setLoading(false); }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({ name: emp.name, email: emp.email, employee_number: emp.employee_number, department: emp.department || '', team: emp.team || '', position: emp.position || '', title: emp.title || '', group_type: emp.group_type, is_evaluated: emp.is_evaluated, role: emp.role, first_evaluator_id: emp.first_evaluator_id || '', second_evaluator_id: emp.second_evaluator_id || '' });
  };

  const handleSave = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('employees').update({ name: editForm.name, email: editForm.email, employee_number: editForm.employee_number, department: editForm.department || null, team: editForm.team || null, position: editForm.position || null, title: editForm.title || null, group_type: editForm.group_type, is_evaluated: editForm.is_evaluated, role: editForm.role, first_evaluator_id: editForm.first_evaluator_id || null, second_evaluator_id: editForm.second_evaluator_id || null }).eq('id', editingEmployee.id);
      if (error) throw error;
      setEmployees((prev) => prev.map((emp) => emp.id === editingEmployee.id ? { ...emp, ...editForm } : emp));
      setEditingEmployee(null);
      alert('저장되었습니다');
    } catch (error) { console.error('Failed to save:', error); alert('저장 중 오류가 발생했습니다'); } finally { setSaving(false); }
  };

  if (loading) return (<div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div></div>);
  if (!user) return (<div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>);

  const filteredEmployees = employees.filter((emp) => emp.name.includes(searchTerm) || emp.email.includes(searchTerm) || emp.employee_number.includes(searchTerm));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8"><h1 className="text-3xl font-bold text-primary mb-2">관리자 패널</h1><p className="text-gray-600">구성원 정보 및 평가 데이터 관리</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/org-chart" className="flex items-center space-x-4 p-6 bg-primary bg-opacity-10 border-2 border-primary rounded-lg hover:bg-opacity-20 transition"><GitBranch className="text-primary" size={32} /><div><h3 className="font-bold text-primary">조직도 관리</h3><p className="text-sm text-gray-600">조직 트리 편집 및 조회</p></div></Link>
        <Link href="/admin/upload" className="flex items-center space-x-4 p-6 bg-secondary bg-opacity-10 border-2 border-secondary rounded-lg hover:bg-opacity-20 transition"><Upload className="text-secondary" size={32} /><div><h3 className="font-bold text-primary">자체평가 업로드</h3><p className="text-sm text-gray-600">Excel 파일에서 데이터 일괄 업로드</p></div></Link>
        <button onClick={() => { const e = prompt('새 사용자 이메일:'); }} className="flex items-center space-x-4 p-6 bg-light border-2 border-gray-200 rounded-lg hover:border-secondary transition"><Plus className="text-gray-400" size={32} /><div className="text-left"><h3 className="font-bold text-primary">새 구성원 추가</h3><p className="text-sm text-gray-600">새 구성원 정보 등록</p></div></button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-bold text-primary mb-4">구성원 목록</h2><input type="text" placeholder="이름, 이메일 또는 사원번호로 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary" /></div>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-light border-b border-gray-200"><tr><th className="text-left px-6 py-3 font-semibold text-gray-700">이름</th><th className="text-left px-6 py-3 font-semibold text-gray-700">이메일</th><th className="text-left px-6 py-3 font-semibold text-gray-700">부서</th><th className="text-left px-6 py-3 font-semibold text-gray-700">역할</th><th className="text-left px-6 py-3 font-semibold text-gray-700">평가대상</th><th className="text-left px-6 py-3 font-semibold text-gray-700">작업</th></tr></thead>
          <tbody>{filteredEmployees.map((emp) => (<tr key={emp.id} className="border-b border-gray-200 hover:bg-light transition"><td className="px-6 py-3"><div><p className="font-medium text-gray-900">{emp.name}</p><p className="text-xs text-gray-600">{emp.title}</p></div></td><td className="px-6 py-3 text-sm text-gray-600">{emp.email}</td><td className="px-6 py-3 text-sm text-gray-600">{emp.department}</td><td className="px-6 py-3 text-sm"><span className="px-3 py-1 bg-secondary bg-opacity-10 text-secondary rounded-full text-xs font-medium">{USER_ROLES[emp.role] || emp.role}</span></td><td className="px-6 py-3 text-sm">{emp.is_evaluated ? <span className="text-success">예</span> : <span className="text-gray-500">아니오</span>}</td><td className="px-6 py-3 text-sm"><button onClick={() => openEditModal(emp)} className="text-secondary hover:text-primary transition font-medium">편집</button></td></tr>))}</tbody></table></div>
        {filteredEmployees.length === 0 && <div className="text-center py-12"><p className="text-gray-600">검색 결과가 없습니다</p></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-600 mb-1">전체 구성원</p><p className="text-3xl font-bold text-primary">{employees.length}</p></div>
        <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-600 mb-1">평가 대상</p><p className="text-3xl font-bold text-secondary">{employees.filter((e) => e.is_evaluated).length}</p></div>
        <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-600 mb-1">평가자</p><p className="text-3xl font-bold text-success">{employees.filter((e) => ['first_evaluator','second_evaluator','ceo'].includes(e.role)).length}</p></div>
      </div>

      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl"><h2 className="text-xl font-bold text-primary">구성원 편집</h2><button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button></div>
            <div className="p-6 space-y-6">
              <div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">기본 정보</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">이름</label><input type="text" value={editForm.name||''} onChange={(e)=>setEditForm({...editForm,name:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">사번</label><input type="text" value={editForm.employee_number||''} onChange={(e)=>setEditForm({...editForm,employee_number:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">이메일</label><input type="email" value={editForm.email||''} onChange={(e)=>setEditForm({...editForm,email:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div></div></div>
              <div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">조직 정보</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">본부</label><input type="text" value={editForm.department||''} onChange={(e)=>setEditForm({...editForm,department:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">팀</label><input type="text" value={editForm.team||''} onChange={(e)=>setEditForm({...editForm,team:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">직무</label><input type="text" value={editForm.position||''} onChange={(e)=>setEditForm({...editForm,position:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">직책</label><input type="text" value={editForm.title||''} onChange={(e)=>setEditForm({...editForm,title:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div></div></div>
              <div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">평가 설정</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">평가그룹</label><select value={editForm.group_type||'팀원'} onChange={(e)=>setEditForm({...editForm,group_type:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="팀원">팀원</option><option value="팀장급">팀장급</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">시스템역할</label><select value={editForm.role||'employee'} onChange={(e)=>setEditForm({...editForm,role:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="employee">구성원</option><option value="first_evaluator">1차평가자</option><option value="second_evaluator">2차평가자</option><option value="ceo">CEO</option><option value="admin">관리자</option></select></div><div className="md:col-span-2"><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={editForm.is_evaluated||false} onChange={(e)=>setEditForm({...editForm,is_evaluated:e.target.checked})} className="w-5 h-5 text-secondary border-gray-300 rounded focus:ring-secondary"/><span className="text-sm font-medium text-gray-700">평가대상</span></label></div></div></div>
              <div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">평가자 지정</h3><div className="grid grid-cols-1 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">1차평가자</label><select value={editForm.first_evaluator_id||''} onChange={(e)=>setEditForm({...editForm,first_evaluator_id:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="">선택안함</option>{employees.filter((e)=>['first_evaluator','second_evaluator','ceo','admin'].includes(e.role)).map((e)=>(<option key={e.id} value={e.id}>{e.name} ({e.title||e.department})</option>))}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">2차평가자</label><select value={editForm.second_evaluator_id||''} onChange={(e)=>setEditForm({...editForm,second_evaluator_id:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"><option value="">선택안함</option>{employees.filter((e)=>['second_evaluator','ceo'].includes(e.role)).map((e)=>(<option key={e.id} value={e.id}>{e.name} ({e.title||e.department})</option>))}</select></div></div></div>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-xl"><button onClick={()=>setEditingEmployee(null)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">취소</button><button onClick={handleSave} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"><Save size={16}/><span>{saving?'저장중...':'저장'}</span></button></div>
          </div>
        </div>
      )}
    </div>
  );
}
