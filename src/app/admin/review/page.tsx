'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, FileText, X, Search, Mail, Download, Lock, Unlock } from 'lucide-react';

type Emp = Employee & { division?: string | null; group_type?: string };
interface Rec { id: string; employee_id: string; period_id?: string; content_json: any; uploaded_at: string; }

const FILE_TYPE_LABELS: Record<string,string> = {
  self_assessment: '본인평가',
  evaluation_opinion: '1차평가',
  department_evaluation: '2차평가',
};

const FILE_TYPE_COLORS: Record<string,string> = {
  self_assessment: 'bg-blue-100 text-blue-700 border-blue-200',
  evaluation_opinion: 'bg-amber-100 text-amber-700 border-amber-200',
  department_evaluation: 'bg-green-100 text-green-700 border-green-200',
};

export default function ReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<Emp|null>(null);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [assessments, setAssessments] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selectedDetail, setSelectedDetail] = useState<{emp: Emp, ft: string}|null>(null);
  const [filter, setFilter] = useState<'all'|'unregistered'>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const sid = document.cookie.split('; ').find(r=>r.startsWith('session_id='))?.split('=')[1];
      if (!sid) { router.push('/'); return; }
      const { data: ud } = await supabase.from('employees').select('*').eq('id', sid).single();
      if (!ud || ud.role !== 'admin') { router.push('/dashboard'); return; }
      setUser(ud as Emp);
      const { data: emps } = await supabase.from('employees').select('*').order('name');
      if (emps) setEmployees(emps as Emp[]);
      const { data: recs } = await supabase.from('self_assessments').select('*').order('uploaded_at',{ascending:false});
      if (recs) setAssessments(recs as Rec[]);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const getRecord = (empId: string, ft: string) => assessments.find(a => a.employee_id === empId && a.content_json?.fileType === ft);

  const getStatus = (emp: Emp, ft: string): { label: string; color: string; confirmed: boolean; submitted: boolean; exists: boolean } => {
    const r = getRecord(emp.id, ft);
    if (!r) return { label: '미등록', color: 'bg-gray-100 text-gray-400', confirmed: false, submitted: false, exists: false };
    if (r.content_json?.adminConfirmed) return { label: '확정', color: 'bg-purple-100 text-purple-700 font-bold', confirmed: true, submitted: true, exists: true };
    if (r.content_json?.submitted) return { label: '제출완료', color: 'bg-green-100 text-green-700', confirmed: false, submitted: true, exists: true };
    return { label: '진행중', color: 'bg-yellow-100 text-yellow-700', confirmed: false, submitted: false, exists: true };
  };

  const filtered = useMemo(() => {
    let list = employees;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.team || '').toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'unregistered') {
      list = list.filter(e => !getRecord(e.id, 'self_assessment'));
    }
    return list;
  }, [employees, searchTerm, filter, assessments]);

  // Phase3 #5: 메일 발송 (mailto)
  const sendEmail = () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) { alert('선택된 직원이 없습니다.'); return; }
    const emails = ids.map(id => employees.find(e=>e.id===id)?.email).filter(Boolean) as string[];
    if (emails.length === 0) { alert('선택된 직원의 이메일 주소가 없습니다.'); return; }
    const subject = encodeURIComponent('[인사평가] 본인평가 등록 요청');
    const body = encodeURIComponent(
      '안녕하세요,\n\n인사평가 시스템에서 본인평가가 미등록 상태입니다.\n아래 링크로 접속하여 등록을 완료해주세요.\n\nhttps://hr-evaluation-4huk.vercel.app\n\n감사합니다.'
    );
    // BCC로 메일 발송 (한 번에 50명까지)
    const bcc = emails.join(',');
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  };

  const selectAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    filtered.forEach(e => { next[e.id] = val; });
    setSelectedIds(next);
  };

  const selectUnregistered = () => {
    const next: Record<string, boolean> = {};
    employees.forEach(e => {
      if (!getRecord(e.id, 'self_assessment')) next[e.id] = true;
    });
    setSelectedIds(next);
  };

  // Phase3 #6: CSV 다운로드 (2차평가자 기준 + 상세 포함)
  const downloadCSV = () => {
    const headers = [
      '이름','이메일','본부','팀','직책','그룹',
      '본인평가_상태','1차평가_상태','2차평가_상태',
      '1차_납기','1차_품질','1차_효율','1차_리더십','1차_성장','1차_윤리','1차_총점',
      '2차_등급','확정여부'
    ];
    const rows = employees.map(e => {
      const self = getRecord(e.id, 'self_assessment');
      const first = getRecord(e.id, 'evaluation_opinion');
      const second = getRecord(e.id, 'department_evaluation');
      const sc = first?.content_json?.scores || {};
      const stat = (r:Rec|undefined) => !r ? '미등록' : (r.content_json?.adminConfirmed ? '확정' : (r.content_json?.submitted ? '제출완료' : '진행중'));
      const confirmedAny = (self?.content_json?.adminConfirmed || first?.content_json?.adminConfirmed || second?.content_json?.adminConfirmed) ? '확정' : '';
      return [
        e.name || '', e.email || '', e.department || '', e.team || '', e.title || '', e.group_type || '',
        stat(self), stat(first), stat(second),
        sc.delivery ?? '', sc.quality ?? '', sc.efficiency ?? '',
        sc.leadership ?? '', sc.growth ?? '', sc.ethics ?? '',
        first?.content_json?.totalScore ?? '',
        second?.content_json?.finalGrade ?? '',
        confirmedAny
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `평가데이터_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Phase3 #2: 관리자 확정/해제
  const toggleConfirm = async (empId: string, ft: string) => {
    const r = getRecord(empId, ft);
    if (!r) { alert('등록된 평가가 없습니다.'); return; }
    const confirmed = !!r.content_json?.adminConfirmed;
    const msg = confirmed
      ? '확정을 해제하시겠습니까?\n해제 후 평가자가 제출취소를 할 수 있습니다.'
      : '이 평가를 확정 처리하시겠습니까?\n확정 후에는 평가자가 제출취소를 할 수 없습니다.';
    if (!window.confirm(msg)) return;
    const newContent = { ...r.content_json, adminConfirmed: !confirmed, confirmedAt: !confirmed ? new Date().toISOString() : null };
    const { error } = await supabase.from('self_assessments').update({ content_json: newContent }).eq('id', r.id);
    if (error) { console.error(error); alert('확정 처리 중 오류가 발생했습니다.'); return; }
    await loadData();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>;

  const selectedCount = Object.values(selectedIds).filter(v=>v).length;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/admin" className="flex items-center space-x-2 text-secondary hover:text-primary transition">
          <ArrowLeft size={20}/><span>돌아가기</span>
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">평가 데이터 조회</h1>
        <p className="text-gray-600">구성원별 본인평가 / 1차평가 / 2차평가 진행 현황을 한눈에 확인합니다.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400"/>
            <input type="text" placeholder="이름, 본부, 팀, 직책으로 검색" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"/>
          </div>
          <div className="flex space-x-2">
            <button onClick={()=>setFilter('all')} className={`px-3 py-2 rounded-lg text-sm font-medium ${filter==='all'?'bg-primary text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>전체</button>
            <button onClick={()=>setFilter('unregistered')} className={`px-3 py-2 rounded-lg text-sm font-medium ${filter==='unregistered'?'bg-primary text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>본인평가 미등록자만</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
          <button onClick={()=>selectAll(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">전체선택</button>
          <button onClick={()=>selectAll(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">선택해제</button>
          <button onClick={selectUnregistered} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs hover:bg-yellow-200">미등록자만 선택</button>
          <span className="text-xs text-gray-600 ml-2 font-medium">{selectedCount}명 선택됨</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={sendEmail} className="flex items-center space-x-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-opacity-90"><Mail size={14}/><span>등록요청 메일 발송</span></button>
            <button onClick={downloadCSV} className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-opacity-90"><Download size={14}/><span>전체 데이터 다운로드 (CSV)</span></button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">총 {filtered.length}명</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-light border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-12 text-center">
                <input type="checkbox" onChange={e=>selectAll(e.target.checked)} className="cursor-pointer"/>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">이름</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">본부/팀</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">직책</th>
              <th className="text-center px-4 py-3 font-semibold text-blue-600">본인평가</th>
              <th className="text-center px-4 py-3 font-semibold text-amber-600">1차평가</th>
              <th className="text-center px-4 py-3 font-semibold text-green-600">2차평가</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const selfStat = getStatus(emp, 'self_assessment');
              const firstStat = getStatus(emp, 'evaluation_opinion');
              const secondStat = getStatus(emp, 'department_evaluation');
              const renderCell = (stat: ReturnType<typeof getStatus>, ft: string) => (
                <div className="flex items-center justify-center space-x-1">
                  <button onClick={()=>setSelectedDetail({emp, ft})} className={`px-2 py-1 rounded text-xs ${stat.color} hover:opacity-80 transition`}>{stat.label}</button>
                  {stat.exists && stat.submitted && (
                    <button onClick={()=>toggleConfirm(emp.id, ft)} title={stat.confirmed?'확정 해제':'확정 처리'} className="hover:scale-110 transition">
                      {stat.confirmed
                        ? <Lock size={14} className="text-purple-600"/>
                        : <Unlock size={14} className="text-gray-400 hover:text-purple-600"/>}
                    </button>
                  )}
                </div>
              );
              return (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-light transition">
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={selectedIds[emp.id] || false} onChange={e=>setSelectedIds({...selectedIds, [emp.id]: e.target.checked})} className="cursor-pointer"/>
                  </td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{emp.name}</p></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{emp.department}/{emp.team}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{emp.title}</td>
                  <td className="px-4 py-3 text-center">{renderCell(selfStat, 'self_assessment')}</td>
                  <td className="px-4 py-3 text-center">{renderCell(firstStat, 'evaluation_opinion')}</td>
                  <td className="px-4 py-3 text-center">{renderCell(secondStat, 'department_evaluation')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDetail && (() => {
        const rec = getRecord(selectedDetail.emp.id, selectedDetail.ft);
        const ft = selectedDetail.ft;
        const c = rec?.content_json || {};
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedDetail(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-primary">{selectedDetail.emp.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${FILE_TYPE_COLORS[ft] || 'bg-gray-100'}`}>{FILE_TYPE_LABELS[ft] || ft}</span>
                  {c.adminConfirmed && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center"><Lock size={12} className="mr-1"/>확정됨</span>}
                </div>
                <button onClick={()=>setSelectedDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
              </div>
              <div className="p-6 space-y-4">
                {!rec ? (
                  <div className="text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300"/>
                    <p className="text-gray-500">등록된 평가가 없습니다.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div className="bg-light p-2 rounded"><span className="text-gray-500">본부</span><p className="font-medium">{selectedDetail.emp.department || '-'}</p></div>
                      <div className="bg-light p-2 rounded"><span className="text-gray-500">팀</span><p className="font-medium">{selectedDetail.emp.team || '-'}</p></div>
                      <div className="bg-light p-2 rounded"><span className="text-gray-500">직책</span><p className="font-medium">{selectedDetail.emp.title || '-'}</p></div>
                      <div className="bg-light p-2 rounded"><span className="text-gray-500">업로드일</span><p className="font-medium">{new Date(rec.uploaded_at).toLocaleDateString('ko-KR')}</p></div>
                    </div>
                    {ft === 'self_assessment' && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">주요 성과</h3>
                        <div className="space-y-3">
                          {(c.achievements || []).map((a:string,i:number)=>(
                            <div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                              <span className="text-xs font-bold text-blue-600 mb-1 block">성과 {i+1}</span>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ft === 'evaluation_opinion' && (
                      <>
                        {c.evaluator && <div className="p-4 bg-amber-50 rounded-lg border border-amber-200"><span className="text-xs font-bold text-amber-600">평가자</span><p className="font-medium">{c.evaluator.name} ({c.evaluator.type || '1차평가자'})</p></div>}
                        {c.achievements && c.achievements.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">주요 성과</h3>
                            <div className="space-y-3">
                              {c.achievements.map((a:string,i:number)=>(<div key={i} className="p-4 bg-amber-50 rounded-lg border border-amber-100"><span className="text-xs font-bold text-amber-600 block">성과 {i+1}</span><p className="text-sm whitespace-pre-wrap">{a}</p></div>))}
                            </div>
                          </div>
                        )}
                        {c.scores && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">평가 점수</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 border-2 border-primary rounded-lg">
                                <h4 className="text-xs font-bold text-primary mb-3">성과평가 (70%)</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>납기(35%)</span><span className="font-bold">{c.scores.delivery || '-'}/7</span></div>
                                  <div className="flex justify-between"><span>품질(35%)</span><span className="font-bold">{c.scores.quality || '-'}/7</span></div>
                                  <div className="flex justify-between"><span>효율(30%)</span><span className="font-bold">{c.scores.efficiency || '-'}/7</span></div>
                                  <div className="flex justify-between pt-2 border-t font-bold text-primary"><span>환산</span><span>{c.perfScore}</span></div>
                                </div>
                              </div>
                              <div className="p-4 border-2 border-secondary rounded-lg">
                                <h4 className="text-xs font-bold text-secondary mb-3">역량평가 (30%)</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>리더십(35%)</span><span className="font-bold">{c.scores.leadership || '-'}/7</span></div>
                                  <div className="flex justify-between"><span>성장(35%)</span><span className="font-bold">{c.scores.growth || '-'}/7</span></div>
                                  <div className="flex justify-between"><span>윤리(30%)</span><span className="font-bold">{c.scores.ethics || '-'}/7</span></div>
                                  <div className="flex justify-between pt-2 border-t font-bold text-secondary"><span>환산</span><span>{c.compScore}</span></div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 p-4 bg-primary text-white rounded-lg text-center"><span className="text-sm">종합점수</span><p className="text-3xl font-bold">{c.totalScore}</p></div>
                          </div>
                        )}
                        {c.comment && <div className="p-4 bg-gray-50 rounded-lg"><span className="text-xs font-bold text-gray-600">개선사항/육성계획</span><p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{c.comment}</p></div>}
                        {c.attachedFile && <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"><span className="text-xs">📎 {c.attachedFile.name} ({Math.round(c.attachedFile.size/1024)} KB)</span><a href={c.attachedFile.data} download={c.attachedFile.name} className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-opacity-90"><Download size={12}/><span>다운로드</span></a></div>}
                      </>
                    )}
                    {ft === 'department_evaluation' && (
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-light rounded-lg"><span className="text-xs text-gray-500">평가자</span><p className="font-bold">{c.evaluator || '-'}</p></div>
                        <div className="p-3 bg-light rounded-lg"><span className="text-xs text-gray-500">본부</span><p className="font-bold">{c.deptName || '-'}</p></div>
                        {c.finalGrade && <div className={`p-3 rounded-lg ${c.finalGrade==='상'?'bg-green-100':c.finalGrade==='중'?'bg-yellow-100':'bg-red-100'}`}><span className="text-xs text-gray-500">최종등급</span><p className="text-2xl font-bold">{c.finalGrade}</p></div>}
                      </div>
                    )}
                  </>
                )}
              </div>
              {rec && (
                <div className="flex justify-end space-x-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                  <button onClick={()=>toggleConfirm(selectedDetail.emp.id, ft)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${c.adminConfirmed ? 'bg-orange-500 text-white' : 'bg-purple-600 text-white'} hover:opacity-90`}>
                    {c.adminConfirmed ? <><Unlock size={14}/><span>확정 해제</span></> : <><Lock size={14}/><span>확정 처리</span></>}
                  </button>
                  <button onClick={()=>setSelectedDetail(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">닫기</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
