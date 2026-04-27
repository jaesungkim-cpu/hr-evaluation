"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Employee } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Save, User, Users, Star, AlertTriangle, CheckCircle } from "lucide-react";

type EmployeeExt = Employee & { division?: string | null };

const SCORE_LABELS = ["", "전혀 아니다", "매우 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "대체로 그렇다", "매우 그렇다"];
const PERF_ITEMS = [
  { key: "delivery", label: "납기", weight: 35, question: "요청한 일정을 준수하였나요?" },
  { key: "quality", label: "품질", weight: 35, question: "결과물이 회사의 기대치에 부합하였나요?" },
  { key: "efficiency", label: "효율", weight: 30, question: "성과 달성을 위해 투입한 인원, 비용, 시간 등은 효율적이었나요?" },
];
const COMP_ITEMS = [
  { key: "leadership", label: "리더십", weight: 35, question: "조직의 명확한 방향과 목표를 인지하여 문제 상황에서 책임 회피 없이 결과를 끝까지 이끌고 있나요?" },
  { key: "growth", label: "성장지향성", weight: 35, question: "실패 혹은 장애상황 발생 시 한계를 인식하고 피드백을 수용하여 개선 의지를 가지고 행동에 옮기고 있나요?" },
  { key: "ethics", label: "윤리의식", weight: 30, question: "조직의 규정과 절차를 일관되게 준수하고 있나요? (지각, 무단결근 등의 발생 없음 포함)" },
];

export default function EvaluateDirectPage() {
  const router = useRouter();
  const [user, setUser] = useState<EmployeeExt|null>(null);
  const [employees, setEmployees] = useState<EmployeeExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalMode, setEvalMode] = useState<'first'|'second'>('first');
  const [selectedEvaluatee, setSelectedEvaluatee] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['','','']);
  const [perfScores, setPerfScores] = useState<Record<string,number>>({delivery:4,quality:4,efficiency:4});
  const [compScores, setCompScores] = useState<Record<string,number>>({leadership:4,growth:4,ethics:4});
  const [comment, setComment] = useState('');
  const [grades, setGrades] = useState<Record<string,string>>({});
  const [existingEvals, setExistingEvals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const sid = document.cookie.split('; ').find((r)=>r.startsWith('session_id='))?.split('=')[1];
      if (!sid) { router.push('/'); return; }
      const { data: ud } = await supabase.from('employees').select('*').eq('id', sid).single();
      if (!ud) { router.push('/'); return; }
      setUser(ud);
      if (ud.role==='second_evaluator'||ud.role==='ceo') setEvalMode('second');
      const { data: emps } = await supabase.from('employees').select('*').order('name');
      if (emps) setEmployees(emps);
      const { data: evals } = await supabase.from('self_assessments').select('*');
      if (evals) setExistingEvals(evals);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const myEvaluatees = useMemo(() => {
    if (!user) return [];
    if (user.role==='admin') return employees.filter((e)=>e.is_evaluated);
    if (user.role==='first_evaluator') return employees.filter((e)=>e.first_evaluator_id===user.id||(e.department===user.department&&e.team===user.team&&e.id!==user.id&&e.title==='팀원'));
    return employees.filter((e)=>e.is_evaluated);
  }, [user, employees]);

  const deptEvaluatees = useMemo(() => {
    if (!user) return [];
    if (user.role==='admin'||user.role==='ceo') return employees.filter((e)=>e.is_evaluated);
    return employees.filter((e)=>e.department===user.department&&e.is_evaluated);
  }, [user, employees]);

  const calcPerfScore = () => PERF_ITEMS.reduce((s,i)=>s+(perfScores[i.key]||0)*i.weight,0)/7;
  const calcCompScore = () => COMP_ITEMS.reduce((s,i)=>s+(compScores[i.key]||0)*i.weight,0)/7;
  const calcTotal = () => Math.round((calcPerfScore()*0.7+calcCompScore()*0.3)*100)/100;

  const handleSaveFirst = async () => {
    if (!selectedEvaluatee) { alert('피평가자를 선택해주세요'); return; }
    if (achievements.filter((a)=>a.trim()).length===0) { alert('주요성과를 1건 이상 입력해주세요'); return; }
    if (comment.length<50) { alert('개선사항/육성계획을 50자 이상 입력해주세요 (현재 '+comment.length+'자)'); return; }
    setSaving(true);
    try {
      const ev = employees.find((e)=>e.id===selectedEvaluatee);
      const { error } = await supabase.from('self_assessments').insert({ employee_id: selectedEvaluatee, content_json: { fileType:'evaluation_opinion', evaluator:{name:user?.name,department:user?.department,team:user?.team,type:'1차평가자'}, achievements:achievements.filter((a)=>a.trim()), scores:{...perfScores,...compScores}, perfScore:Math.round(calcPerfScore()*100)/100, compScore:Math.round(calcCompScore()*100)/100, totalScore:calcTotal(), comment, registeredVia:'web_app' }, uploaded_at: new Date().toISOString() });
      if (error) throw error;
      setSaved(true); alert(`${ev?.name}님의 1차 평가가 등록되었습니다. (종합: ${calcTotal()}점)`);
    } catch(e) { console.error(e); alert('저장 중 오류가 발생했습니다'); } finally { setSaving(false); }
  };

  const handleSaveSecond = async () => {
    const entries = Object.entries(grades).filter(([,v])=>v);
    if (entries.length===0) { alert('최소 1명 이상 등급을 부여해주세요'); return; }
    setSaving(true);
    try {
      const inserts = entries.map(([empId,grade])=>({ employee_id:empId, content_json:{fileType:'department_evaluation',deptName:user?.department,finalGrade:grade,evaluator:user?.name,registeredVia:'web_app'}, uploaded_at:new Date().toISOString() }));
      const { error } = await supabase.from('self_assessments').insert(inserts);
      if (error) throw error;
      setSaved(true); alert(`${entries.length}명의 2차 평가 등급이 등록되었습니다.`);
    } catch(e) { console.error(e); alert('저장 중 오류가 발생했습니다'); } finally { setSaving(false); }
  };

  const gradeStats = useMemo(() => {
    const t = deptEvaluatees;
    const l = t.filter((e)=>e.group_type==='팀장급'); const m = t.filter((e)=>e.group_type==='팀원');
    const cnt = (list:EmployeeExt[],g:string) => list.filter((e)=>grades[e.id]===g).length;
    return {
      leaders:{total:l.length, 상:{target:Math.round(l.length*0.3),assigned:cnt(l,'상')}, 중:{target:Math.round(l.length*0.4),assigned:cnt(l,'중')}, 하:{target:Math.round(l.length*0.3),assigned:cnt(l,'하')}},
      members:{total:m.length, 상:{target:Math.round(m.length*0.3),assigned:cnt(m,'상')}, 중:{target:Math.round(m.length*0.4),assigned:cnt(m,'중')}, 하:{target:Math.round(m.length*0.3),assigned:cnt(m,'하')}},
    };
  }, [deptEvaluatees, grades]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">로그인이 필요합니다</p></div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center space-x-4 mb-6"><Link href="/dashboard" className="flex items-center space-x-2 text-secondary hover:text-primary transition"><ArrowLeft size={20}/><span>돌아가기</span></Link></div>
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary mb-2">평가 등록</h1><p className="text-gray-600">구성원 평가를 직접 등록합니다</p></div>
        {(user.role==='admin'||user.role==='second_evaluator'||user.role==='ceo')&&(
          <div className="flex bg-light rounded-lg p-1"><button onClick={()=>{setEvalMode('first');setSaved(false);}} className={`px-4 py-2 rounded font-medium transition ${evalMode==='first'?'bg-white text-primary shadow':'text-gray-600'}`}><User size={16} className="inline mr-1"/>1차 평가</button><button onClick={()=>{setEvalMode('second');setSaved(false);}} className={`px-4 py-2 rounded font-medium transition ${evalMode==='second'?'bg-white text-primary shadow':'text-gray-600'}`}><Users size={16} className="inline mr-1"/>2차 평가</button></div>
        )}
      </div>

      {evalMode==='first'&&!saved&&(
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-bold text-primary mb-4">피평가자 선택</h2><select value={selectedEvaluatee} onChange={(e)=>setSelectedEvaluatee(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:outline-none text-lg"><option value="">-- 평가할 구성원을 선택하세요 --</option>{myEvaluatees.map((e)=>(<option key={e.id} value={e.id}>{e.name} ({e.department}/{e.team}) - {e.title}</option>))}</select></div>

          {selectedEvaluatee&&(<>
            <div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-bold text-primary mb-4">주요 성과</h2><p className="text-sm text-gray-500 mb-4">피평가자의 주요 성과를 기재해주세요 (최소 1건)</p>{achievements.map((a,i)=>(<div key={i} className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">성과 {i+1}</label><textarea value={a} onChange={(e)=>{const n=[...achievements];n[i]=e.target.value;setAchievements(n);}} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:outline-none" placeholder="성과 내용을 입력하세요..."/></div>))}<button onClick={()=>setAchievements([...achievements,''])} className="text-secondary hover:text-primary text-sm font-medium">+ 성과 추가</button></div>

            <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-primary">성과평가 (70%)</h2><div className="text-2xl font-bold text-primary">{Math.round(calcPerfScore()*100)/100}점</div></div><p className="text-sm text-gray-500 mb-6">7점 척도 (1=전혀 아니다 ~ 7=매우 그렇다)</p>{PERF_ITEMS.map((item)=>(<div key={item.key} className="mb-6 p-4 bg-light rounded-lg"><div className="flex items-center justify-between mb-2"><span className="font-bold text-primary">{item.label} <span className="text-sm font-normal text-gray-500">({item.weight}%)</span></span><span className="text-lg font-bold text-secondary">{perfScores[item.key]}점</span></div><p className="text-sm text-gray-600 mb-3">{item.question}</p><div className="flex space-x-2">{[1,2,3,4,5,6,7].map((s)=>(<button key={s} onClick={()=>setPerfScores({...perfScores,[item.key]:s})} className={`w-10 h-10 rounded-full font-bold text-sm transition ${perfScores[item.key]===s?'bg-secondary text-white shadow-lg scale-110':'bg-white border-2 border-gray-300 text-gray-600 hover:border-secondary'}`}>{s}</button>))}</div><p className="text-xs text-gray-400 mt-1">{SCORE_LABELS[perfScores[item.key]]}</p></div>))}</div>

            <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-primary">역량평가 (30%)</h2><div className="text-2xl font-bold text-primary">{Math.round(calcCompScore()*100)/100}점</div></div><p className="text-sm text-gray-500 mb-6">7점 척도 (1=전혀 아니다 ~ 7=매우 그렇다)</p>{COMP_ITEMS.map((item)=>(<div key={item.key} className="mb-6 p-4 bg-light rounded-lg"><div className="flex items-center justify-between mb-2"><span className="font-bold text-primary">{item.label} <span className="text-sm font-normal text-gray-500">({item.weight}%)</span></span><span className="text-lg font-bold text-secondary">{compScores[item.key]}점</span></div><p className="text-sm text-gray-600 mb-3">{item.question}</p><div className="flex space-x-2">{[1,2,3,4,5,6,7].map((s)=>(<button key={s} onClick={()=>setCompScores({...compScores,[item.key]:s})} className={`w-10 h-10 rounded-full font-bold text-sm transition ${compScores[item.key]===s?'bg-secondary text-white shadow-lg scale-110':'bg-white border-2 border-gray-300 text-gray-600 hover:border-secondary'}`}>{s}</button>))}</div><p className="text-xs text-gray-400 mt-1">{SCORE_LABELS[compScores[item.key]]}</p></div>))}</div>

            <div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-bold text-primary mb-4">개선사항 및 육성계획</h2><p className="text-sm text-gray-500 mb-2">50자 이상 기재 필수</p><textarea value={comment} onChange={(e)=>setComment(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:outline-none" placeholder="개선이 필요한 사항, 육성 계획을 작성해주세요..."/><p className={`text-sm mt-1 ${comment.length>=50?'text-green-600':'text-red-500'}`}>{comment.length}자 / 최소 50자</p></div>

            <div className="bg-primary text-white rounded-lg shadow p-6 text-center"><p className="text-sm mb-1">종합점수</p><p className="text-5xl font-bold mb-2">{calcTotal()}</p><p className="text-sm opacity-75">성과({Math.round(calcPerfScore()*100)/100}) × 70% + 역량({Math.round(calcCompScore()*100)/100}) × 30%</p></div>

            <div className="flex justify-end"><button onClick={handleSaveFirst} disabled={saving} className="flex items-center space-x-2 px-8 py-3 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 text-lg font-medium"><Save size={20}/><span>{saving?'저장 중...':'1차 평가 등록'}</span></button></div>
          </>)}
        </div>
      )}

      {evalMode==='second'&&!saved&&(
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-bold text-primary mb-4">상대평가 비율</h2><div className="grid grid-cols-2 gap-6">{(['leaders','members'] as const).map((group)=>(<div key={group} className="border rounded-lg p-4"><h3 className="font-bold text-primary mb-3">{group==='leaders'?'팀장이상':'팀원'} ({gradeStats[group].total}명)</h3><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-1">등급</th><th className="text-center py-1">비율</th><th className="text-center py-1">기준</th><th className="text-center py-1">부여</th><th className="text-center py-1">차이</th></tr></thead><tbody>{(['상','중','하'] as const).map((g)=>{const s=gradeStats[group][g];const d=s.target-s.assigned;return(<tr key={g} className="border-b"><td className={`py-2 font-bold ${g==='상'?'text-green-600':g==='중'?'text-yellow-600':'text-red-600'}`}>{g}</td><td className="text-center">{g==='상'?'30%':g==='중'?'40%':'30%'}</td><td className="text-center">{s.target}명</td><td className="text-center font-bold">{s.assigned}명</td><td className={`text-center font-bold ${d===0?'text-green-600':d>0?'text-blue-600':'text-red-600'}`}>{d>0?`+${d}`:d}</td></tr>);})}</tbody></table></div>))}</div></div>

          <div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-bold text-primary mb-4">등급 부여</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-light"><tr><th className="text-left px-4 py-2">이름</th><th className="text-left px-4 py-2">팀</th><th className="text-left px-4 py-2">직책분류</th><th className="text-center px-4 py-2">1차평가</th><th className="text-center px-4 py-2">최종등급</th></tr></thead><tbody>{deptEvaluatees.map((emp)=>{const ev=existingEvals.find((e)=>e.employee_id===emp.id&&e.content_json?.fileType==='evaluation_opinion');const ts=ev?.content_json?.totalScore||'-';return(<tr key={emp.id} className="border-b border-gray-100 hover:bg-light"><td className="px-4 py-3 font-medium">{emp.name}</td><td className="px-4 py-3 text-gray-600">{emp.team}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${emp.group_type==='팀장급'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{emp.group_type}</span></td><td className="px-4 py-3 text-center font-bold">{ts}</td><td className="px-4 py-3 text-center"><div className="flex justify-center space-x-2">{['상','중','하'].map((g)=>(<button key={g} onClick={()=>setGrades({...grades,[emp.id]:grades[emp.id]===g?'':g})} className={`w-10 h-10 rounded-lg font-bold text-sm transition ${grades[emp.id]===g?(g==='상'?'bg-green-500 text-white':g==='중'?'bg-yellow-500 text-white':'bg-red-500 text-white'):'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{g}</button>))}</div></td></tr>);})}</tbody></table></div></div>

          <div className="flex justify-end"><button onClick={handleSaveSecond} disabled={saving} className="flex items-center space-x-2 px-8 py-3 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 text-lg font-medium"><Save size={20}/><span>{saving?'저장 중...':'2차 평가 등록'}</span></button></div>
        </div>
      )}

      {saved&&(<div className="bg-white rounded-lg shadow p-12 text-center"><CheckCircle size={64} className="mx-auto mb-4 text-green-500"/><h2 className="text-2xl font-bold text-primary mb-2">평가 등록 완료</h2><p className="text-gray-600 mb-6">{evalMode==='first'?'1차 평가의견서가':'2차 평가 등급이'} 성공적으로 등록되었습니다.</p><div className="flex justify-center space-x-4"><button onClick={()=>{setSaved(false);setSelectedEvaluatee('');setAchievements(['','','']);setPerfScores({delivery:4,quality:4,efficiency:4});setCompScores({leadership:4,growth:4,ethics:4});setComment('');}} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">다른 구성원 평가하기</button><Link href="/admin/review" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90">평가 데이터 조회</Link></div></div>)}
    </div>
  );
}
