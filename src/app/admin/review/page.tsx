'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronDown, ChevronRight, X, Search } from 'lucide-react';

type EmployeeWithDivision = Employee & { division?: string | null };
interface AssessmentRecord { id: string; employee_id: string; period_id: string; content_json: Record<string, any>; uploaded_at: string; employee?: EmployeeWithDivision; }
const FILE_TYPE_LABELS: Record<string,string> = { self_assessment:'본인업적기술서', evaluation_opinion:'평가의견서', department_evaluation:'본부평가표' };
const FILE_TYPE_COLORS: Record<string,string> = { self_assessment:'bg-blue-100 text-blue-700 border-blue-200', evaluation_opinion:'bg-amber-100 text-amber-700 border-amber-200', department_evaluation:'bg-green-100 text-green-700 border-green-200' };

export default function ReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<EmployeeWithDivision|null>(null);
  const [employees, setEmployees] = useState<EmployeeWithDivision[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord|null>(null);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const sid = document.cookie.split('; ').find((r)=>r.startsWith('session_id='))?.split('=')[1];
      if (!sid) { router.push('/'); return; }
      const { data: ud } = await supabase.from('employees').select('*').eq('id', sid).single();
      if (!ud||ud.role!=='admin') { router.push('/dashboard'); return; }
      setUser(ud);
      const { data: emps } = await supabase.from('employees').select('*').order('name');
      if (emps) setEmployees(emps);
      const { data: recs } = await supabase.from('self_assessments').select('*').order('uploaded_at',{ascending:false});
      if (recs&&emps) setAssessments(recs.map((r:any)=>({...r, employee:emps.find((e:any)=>e.id===r.employee_id)})));
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  const filtered = assessments.filter((a) => {
    const ft = a.content_json?.fileType||'';
    if (filterType!=='all'&&ft!==filterType) return false;
    if (searchTerm) { const q=searchTerm.toLowerCase(); const n=a.employee?.name||''; const d=a.employee?.department||''; const t=a.employee?.team||''; if(!n.toLowerCase().includes(q)&&!d.toLowerCase().includes(q)&&!t.toLowerCase().includes(q)) return false; }
    return true;
  });
  const renderDetail = (rec: AssessmentRecord) => {
    const c=rec.content_json||{}; const ft=c.fileType;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedRecord(null)}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl"><div className="flex items-center space-x-3"><h2 className="text-xl font-bold text-primary">{rec.employee?.name}</h2><span className={`px-3 py-1 rounded-full text-xs font-bold border ${FILE_TYPE_COLORS[ft]||'bg-gray-100'}`}>{FILE_TYPE_LABELS[ft]||ft}</span></div><button onClick={()=>setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><span className="text-gray-500">본부</span><p className="font-medium">{rec.employee?.department||'-'}</p></div><div><span className="text-gray-500">팀</span><p className="font-medium">{rec.employee?.team||'-'}</p></div><div><span className="text-gray-500">직책</span><p className="font-medium">{rec.employee?.title||'-'}</p></div><div><span className="text-gray-500">업로드일</span><p className="font-medium">{new Date(rec.uploaded_at).toLocaleDateString('ko-KR')}</p></div></div>
            {ft==='self_assessment'&&<div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">주요 성과</h3><div className="space-y-3">{(c.achievements||[]).map((a:string,i:number)=>(<div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-100"><span className="text-xs font-bold text-blue-600 mb-1 block">성과 {i+1}</span><p className="text-sm text-gray-800 whitespace-pre-wrap">{a}</p></div>))}</div>{c.concurrentAchievements?.length>0&&<div className="mt-4"><h4 className="text-xs font-bold text-gray-500 uppercase mb-2">겸직조직 성과</h4>{c.concurrentAchievements.map((a:string,i:number)=>(<div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2"><p className="text-sm whitespace-pre-wrap">{a}</p></div>))}</div>}</div>}
            {ft==='evaluation_opinion'&&<>{c.evaluator&&<div className="p-4 bg-amber-50 rounded-lg border border-amber-200"><span className="text-xs font-bold text-amber-600">평가자</span><p className="font-medium">{c.evaluator.name} ({c.evaluator.type||'1차평가자'})</p></div>}<div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">주요 성과</h3><div className="space-y-3">{(c.achievements||[]).map((a:string,i:number)=>(<div key={i} className="p-4 bg-amber-50 rounded-lg border border-amber-100"><span className="text-xs font-bold text-amber-600 block">성과 {i+1}</span><p className="text-sm whitespace-pre-wrap">{a}</p></div>))}</div></div>{c.scores&&<div><h3 className="text-sm font-bold text-gray-500 uppercase mb-3">평가 점수</h3><div className="grid grid-cols-2 gap-4"><div className="p-4 border-2 border-primary rounded-lg"><h4 className="text-xs font-bold text-primary mb-3">성과평가 (70%)</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span>납기(35%)</span><span className="font-bold">{c.scores.delivery||'-'}/7</span></div><div className="flex justify-between"><span>품질(35%)</span><span className="font-bold">{c.scores.quality||'-'}/7</span></div><div className="flex justify-between"><span>효율(30%)</span><span className="font-bold">{c.scores.efficiency||'-'}/7</span></div><div className="flex justify-between pt-2 border-t font-bold text-primary"><span>환산</span><span>{c.perfScore}</span></div></div></div><div className="p-4 border-2 border-secondary rounded-lg"><h4 className="text-xs font-bold text-secondary mb-3">역량평가 (30%)</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span>리더십(35%)</span><span className="font-bold">{c.scores.leadership||'-'}/7</span></div><div className="flex justify-between"><span>성장(35%)</span><span className="font-bold">{c.scores.growth||'-'}/7</span></div><div className="flex justify-between"><span>윤리(30%)</span><span className="font-bold">{c.scores.ethics||'-'}/7</span></div><div className="flex justify-between pt-2 border-t font-bold text-secondary"><span>환산</span><span>{c.compScore}</span></div></div></div></div><div className="mt-4 p-4 bg-primary text-white rounded-lg text-center"><span className="text-sm">종합점수</span><p className="text-3xl font-bold">{c.totalScore}</p></div></div>}</>}
            {ft==='department_evaluation'&&<div><div className="flex items-center space-x-4 mb-4"><div className="p-3 bg-light rounded-lg"><span className="text-xs text-gray-500">직책분류</span><p className="font-bold">{c.groupType||'-'}</p></div><div className="p-3 bg-light rounded-lg"><span className="text-xs text-gray-500">본부</span><p className="font-bold">{c.deptName||'-'}</p></div>{c.finalGrade&&<div className={`p-3 rounded-lg ${c.finalGrade==='상'?'bg-green-100':c.finalGrade==='중'?'bg-yellow-100':'bg-red-100'}`}><span className="text-xs text-gray-500">최종등급</span><p className="text-2xl font-bold">{c.finalGrade}</p></div>}</div>{c.scores&&<div className="grid grid-cols-3 gap-3 text-sm"><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">납기</span><p className="text-xl font-bold">{c.scores.delivery}/7</p></div><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">품질</span><p className="text-xl font-bold">{c.scores.quality}/7</p></div><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">효율</span><p className="text-xl font-bold">{c.scores.efficiency}/7</p></div><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">리더십</span><p className="text-xl font-bold">{c.scores.leadership}/7</p></div><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">성장</span><p className="text-xl font-bold">{c.scores.growth}/7</p></div><div className="p-3 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">윤리</span><p className="text-xl font-bold">{c.scores.ethics}/7</p></div></div>}</div>}
          </div>
        </div>
      </div>
    );
  };
  if(loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div>;
  if(!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>;
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center space-x-4 mb-6"><Link href="/admin" className="flex items-center space-x-2 text-secondary hover:text-primary transition"><ArrowLeft size={20}/><span>돌아가기</span></Link></div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-primary mb-2">평가 데이터 조회</h1><p className="text-gray-600">업로드된 업적기술서, 평가의견서, 본부평가표를 조회합니다</p></div>
      <div className="bg-white rounded-lg shadow p-6 mb-6"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search size={18} className="absolute left-3 top-3 text-gray-400"/><input type="text" placeholder="이름, 본부, 팀으로 검색" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/></div><div className="flex space-x-2">{['all','self_assessment','evaluation_opinion','department_evaluation'].map((t)=>(<button key={t} onClick={()=>setFilterType(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType===t?'bg-primary text-white':'bg-light text-gray-600 hover:bg-gray-200'}`}>{t==='all'?'전체':FILE_TYPE_LABELS[t]}</button>))}</div></div><p className="text-sm text-gray-500 mt-3">총 {filtered.length}건</p></div>
      {filtered.length===0?<div className="bg-white rounded-lg shadow p-12 text-center"><FileText size={48} className="mx-auto mb-4 text-gray-300"/><p className="text-gray-500">업로드된 평가 데이터가 없습니다</p><Link href="/admin/upload" className="inline-block mt-4 text-secondary hover:text-primary font-medium">파일 업로드하기 →</Link></div>:
      <div className="bg-white rounded-lg shadow overflow-hidden"><table className="w-full text-sm"><thead className="bg-light border-b border-gray-200"><tr><th className="text-left px-6 py-3 font-semibold text-gray-700">이름</th><th className="text-left px-6 py-3 font-semibold text-gray-700">본부/팀</th><th className="text-left px-6 py-3 font-semibold text-gray-700">파일유형</th><th className="text-left px-6 py-3 font-semibold text-gray-700">업로드일</th><th className="text-left px-6 py-3 font-semibold text-gray-700">상세</th></tr></thead>
        <tbody>{filtered.map((a)=>{const ft=a.content_json?.fileType||'';return(<tr key={a.id} className="border-b border-gray-100 hover:bg-light transition"><td className="px-6 py-3"><p className="font-medium text-gray-900">{a.employee?.name||'알수없음'}</p><p className="text-xs text-gray-500">{a.employee?.title}</p></td><td className="px-6 py-3 text-gray-600">{a.employee?.department}/{a.employee?.team}</td><td className="px-6 py-3"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${FILE_TYPE_COLORS[ft]||'bg-gray-100'}`}>{FILE_TYPE_LABELS[ft]||'기타'}</span></td><td className="px-6 py-3 text-gray-500">{new Date(a.uploaded_at).toLocaleDateString('ko-KR')}</td><td className="px-6 py-3"><button onClick={()=>setSelectedRecord(a)} className="text-secondary hover:text-primary transition font-medium">조회</button></td></tr>);})}</tbody></table></div>}
      {selectedRecord&&renderDetail(selectedRecord)}
    </div>
  );
}
