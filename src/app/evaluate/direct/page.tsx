"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Employee } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Save, Send, X, RotateCcw } from "lucide-react";

// Phase1: 타입을 느슨하게 확장하여 빌드 에러 방지
type Emp = Employee & {
  division?: string | null;
  first_evaluator_id?: string | null;
  second_evaluator_id?: string | null;
  is_evaluated?: boolean;
  group_type?: string;
  created_at?: string;
};

const PERF = [{k:"delivery",l:"납기",w:35},{k:"quality",l:"품질",w:35},{k:"efficiency",l:"효율",w:30}];
const COMP = [{k:"leadership",l:"리더십",w:35},{k:"growth",l:"성장지향성",w:35},{k:"ethics",l:"윤리의식",w:30}];

// Phase1 #8: 실(division) → 하위 팀 매핑
const DIVISION_TEAMS: Record<string, string[]> = {
  "설치업무1실": ["세팅팀", "성남센터"],
  "설치업무2실": ["경인센터", "대전센터", "부산센터", "대구센터", "광주센터"],
};

const calcScore = (items: {k:string,w:number}[], scores: Record<string,number>) =>
  items.reduce((s,i)=>s+(scores[i.k]||0)*i.w,0)/7;

const getDivisionByTitle = (emp: Emp | null): string | null => {
  if (!emp || !emp.title) return null;
  const keys = Object.keys(DIVISION_TEAMS);
  for (let i=0; i<keys.length; i++) {
    if (emp.title.indexOf(keys[i]) >= 0) return keys[i];
  }
  return null;
};

const isHonbujang = (emp: Emp | null): boolean => !!emp && (emp.title || "").indexOf("본부장") >= 0;

// Phase3: 직책에서 팀명 추출 (user.team이 데이터와 안 맞을 때 보정용)
// 예: "부산센터장" → "부산센터", "세팅팀장" → "세팅팀"
const extractTeamFromTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  if (/(센터장|팀장)$/.test(title)) return title.replace(/장$/, "");
  return null;
};

// Phase3-fix: 직책에 "센터장/팀장/실장" 포함 시 1차 평가자 권한 자동 부여
const isFirstEvaluatorByTitle = (emp: Emp | null): boolean => {
  if (!emp || !emp.title) return false;
  const t = emp.title;
  return t.indexOf("센터장") >= 0 || t.indexOf("팀장") >= 0 || t.indexOf("실장") >= 0;
};

export default function EvaluatePage() {
  const router = useRouter();
  const [user, setUser] = useState<Emp|null>(null);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [evals, setEvals] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [scores, setScores] = useState<Record<string,Record<string,number>>>({});
  const [detailEmp, setDetailEmp] = useState<Emp|null>(null);
  const [detailAchievements, setDetailAchievements] = useState<string[]>(["","",""]);
  const [detailScores, setDetailScores] = useState<Record<string,number>>({delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0});
  const [detailComment, setDetailComment] = useState("");
  const [selfAchievements, setSelfAchievements] = useState<string[]>(["","",""]);
  const [saving, setSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"draft"|"submitted">("draft");
  const [grades, setGrades] = useState<Record<string,string>>({});
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [adjustRequest, setAdjustRequest] = useState<Record<string,string>>({});
  const [showDetailCols, setShowDetailCols] = useState(false);
  const [secondDetailEmp, setSecondDetailEmp] = useState<Emp|null>(null);
  const [secondDetailScores, setSecondDetailScores] = useState<Record<string,number>>({delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0});
  const [secondDetailGrade, setSecondDetailGrade] = useState("");
  // Phase2 #20: 컬럼 정렬 상태
  const [sortBy, setSortBy] = useState<{col:string, asc:boolean}>({col:"", asc:true});
  const toggleSort = (col: string) => setSortBy(prev => ({col, asc: prev.col === col ? !prev.asc : true}));
  const sortArrow = (col: string) => sortBy.col === col ? (sortBy.asc ? " ↑" : " ↓") : "";
  // Phase3: 첫 진입에만 selectedRole/selectedOrg 초기화 (저장 후엔 유지)
  const isFirstLoadRef = useRef(true);

  useEffect(()=>{loadData();},[]);

  const loadData = async () => {
    try {
      const sid = document.cookie.split("; ").find(r=>r.startsWith("session_id="))?.split("=")[1];
      if (!sid) { router.push("/"); return; }
      const { data: ud } = await supabase.from("employees").select("*").eq("id", sid).single();
      if (!ud) { router.push("/"); return; }
      const udTyped = ud as Emp;
      setUser(udTyped);
      const { data: emps } = await supabase.from("employees").select("*").order("name");
      if (emps) setEmployees(emps as Emp[]);
      const { data: ev } = await supabase.from("self_assessments").select("*");
      if (ev) setEvals(ev);
      // 첫 진입에만 role/org 초기화 (저장 후 loadData 재호출 시엔 유지)
      if (isFirstLoadRef.current) {
        // 우선순위: 본부장 → 직책 보유자(센터장/팀장/실장) → 명시적 role → 기본 self
        if (isHonbujang(udTyped)) setSelectedRole("first");
        else if (isFirstEvaluatorByTitle(udTyped)) setSelectedRole("first");
        else if (udTyped.role === "first_evaluator") setSelectedRole("first");
        else if (udTyped.role === "second_evaluator") setSelectedRole("second");
        else if (udTyped.role === "admin") setSelectedRole("first");
        else if (udTyped.role === "ceo") setSelectedRole("ceo");
        else setSelectedRole("self");
        // 센터장은 자기 센터(team) 우선, 그 외엔 부서/팀
        const extractedTeam = extractTeamFromTitle(udTyped.title);
        if (extractedTeam && (udTyped.title || "").indexOf("센터장") >= 0) {
          setSelectedOrg(extractedTeam);
        } else if (udTyped.department) {
          setSelectedOrg(udTyped.department + (udTyped.team ? "/" + udTyped.team : ""));
        }
        isFirstLoadRef.current = false;
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const availableRoles = useMemo(() => {
    if (!user) return [];
    const roles: {value:string,label:string}[] = [];
    // Phase3: 본부장은 본인평가 제외
    if (!isHonbujang(user)) {
      roles.push({value:"self",label:"본인평가"});
    }
    // Phase3: 본부장 + 직책(센터장/팀장/실장) 보유자에게 1차 평가자 권한 자동 부여
    if (user.role === "first_evaluator" || user.role === "admin" || isHonbujang(user) || isFirstEvaluatorByTitle(user)) {
      roles.push({value:"first",label:"1차 평가자"});
    }
    if (user.role === "second_evaluator" || user.role === "admin" || isHonbujang(user)) {
      roles.push({value:"second",label:"2차 평가자"});
    }
    if (user.role === "ceo" || user.role === "admin") {
      roles.push({value:"ceo",label:"CEO (최종승인)"});
    }
    return roles;
  }, [user]);

  const availableOrgs = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin" || user.role === "ceo") {
      const set: Record<string, boolean> = {};
      employees.forEach(e => { if (e.department) set[e.department] = true; });
      return Object.keys(set).map(d=>({value:d,label:d}));
    }
    const orgs: {value:string,label:string}[] = [];
    if (user.department) orgs.push({value:user.department,label:user.department});
    if (user.team) orgs.push({value:user.department+"/"+user.team,label:user.team});
    return orgs;
  }, [user, employees]);

  // Phase1 #8, #9, #14: 직책 기반 정확한 필터링
  const evaluatees = useMemo<Emp[]>(() => {
    if (!user) return [];
    let list = employees.filter(e => e.is_evaluated !== false);
    if (selectedRole === "self") return [user];

    if (selectedRole === "first") {
      if (user.role === "admin") {
        if (selectedOrg) list = list.filter(e => e.department === selectedOrg || (e.department+"/"+e.team) === selectedOrg);
      } else {
        const userTitle = user.title || "";
        const userDivision = getDivisionByTitle(user);
        const teamList = userDivision ? DIVISION_TEAMS[userDivision] : null;
        const extractedTeam = extractTeamFromTitle(userTitle);

        if (isHonbujang(user)) {
          // Phase3: 본부장은 같은 본부의 팀장이상 (본인+다른 본부장 제외)
          list = list.filter(e => e.department === user.department && e.group_type === "팀장급" && !isHonbujang(e) && e.id !== user.id);
        } else if (teamList && teamList.length > 0) {
          // #8: 설치업무1실/2실장. division 필드 우선 → team 매핑 fallback
          let candidates = list.filter(e => e.division === userDivision);
          if (candidates.length === 0) {
            candidates = list.filter(e => teamList!.indexOf(e.team || "") >= 0);
          }
          list = candidates.filter(e => e.id !== user.id);
        } else if (userTitle.indexOf("센터장") >= 0) {
          // #9: 센터장은 자기 센터. 직책에서 추출한 팀명 우선
          const targetTeam = extractedTeam || user.team;
          list = list.filter(e => e.team === targetTeam && e.id !== user.id);
        } else if (userTitle.indexOf("팀장") >= 0) {
          // 팀장은 자기 팀
          const targetTeam = extractedTeam || user.team;
          list = list.filter(e => e.team === targetTeam && e.id !== user.id);
        } else {
          // 그 외: first_evaluator_id 매핑
          list = list.filter(e => e.first_evaluator_id === user.id);
        }
      }
    }

    if (selectedRole === "second" || selectedRole === "ceo") {
      if (user.role === "admin") {
        if (selectedOrg) list = list.filter(e => e.department === selectedOrg);
      } else if (selectedRole === "second") {
        list = list.filter(e => e.department === user.department);
      } else {
        if (selectedOrg) list = list.filter(e => e.department === selectedOrg);
      }
      // Phase1 #14: 본부장 제외
      list = list.filter(e => !isHonbujang(e));
    }
    return list;
  }, [user, employees, selectedRole, selectedOrg]);

  // Phase1 #11: submitted 플래그 기반 카운팅
  const stats = useMemo(() => {
    const total = evaluatees.length;
    const target = evaluatees.filter(e=>e.is_evaluated !== false).length;
    const ft = selectedRole === "first" ? "evaluation_opinion" : selectedRole === "self" ? "self_assessment" : "department_evaluation";
    let completed = 0, inProgress = 0;
    for (let i=0; i<evaluatees.length; i++) {
      const e = evaluatees[i];
      const ev = evals.find(x => x.employee_id === e.id && x.content_json && x.content_json.fileType === ft);
      if (ev && ev.content_json && ev.content_json.submitted === true) completed++;
      else if (ev) inProgress++;
    }
    const validScores: number[] = [];
    for (let i=0; i<evaluatees.length; i++) {
      const ev = evals.find(x => x.employee_id === evaluatees[i].id && x.content_json && x.content_json.fileType === "evaluation_opinion");
      const ts = ev && ev.content_json ? (ev.content_json.totalScore || 0) : 0;
      if (ts > 0) validScores.push(ts);
    }
    const avgScore = validScores.length > 0 ? validScores.reduce((a,b)=>a+b,0)/validScores.length : 0;
    const status = (completed === 0 && inProgress === 0) ? "미진행" : (completed >= target && target > 0 ? "제출완료" : "진행 중");
    return { total, target, completed, inProgress, avgScore: Math.round(avgScore*10)/10, status };
  }, [evaluatees, evals, selectedRole]);

  // Phase1 #1: 제출 상태를 evals 기반으로 자동 동기화
  useEffect(() => {
    if (!user) { setSubmitStatus("draft"); return; }
    const ft = selectedRole === "first" ? "evaluation_opinion" : selectedRole === "self" ? "self_assessment" : "department_evaluation";
    const targetList = selectedRole === "self" ? [user] : evaluatees;
    if (targetList.length === 0) { setSubmitStatus("draft"); return; }
    let allSubmitted = true;
    for (let i=0; i<targetList.length; i++) {
      const e = targetList[i];
      const ev = evals.find(x => x.employee_id === e.id && x.content_json && x.content_json.fileType === ft);
      if (!ev || !ev.content_json || ev.content_json.submitted !== true) { allSubmitted = false; break; }
    }
    setSubmitStatus(allSubmitted ? "submitted" : "draft");
  }, [user, evaluatees, evals, selectedRole]);

  const getEval = (empId: string, type: string) => evals.find(e => e.employee_id === empId && e.content_json && e.content_json.fileType === type);
  const getSelfEval = (empId: string) => getEval(empId, "self_assessment");
  const getFirstEval = (empId: string) => getEval(empId, "evaluation_opinion");

  const isReadOnly = submitStatus === "submitted";

  const setInlineScore = (empId: string, key: string, val: number) => {
    if (isReadOnly) return;
    setScores(prev => ({...prev, [empId]: {...(prev[empId]||{delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0}), [key]: val}}));
  };

  const getInlineScores = (empId: string): Record<string,number> => {
    if (scores[empId]) return scores[empId];
    const existing = getFirstEval(empId);
    if (existing && existing.content_json && existing.content_json.scores) return existing.content_json.scores;
    return {delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0};
  };

  const getInlineTotal = (empId: string) => {
    const s = getInlineScores(empId);
    const perf = calcScore(PERF, s);
    const comp = calcScore(COMP, s);
    return Math.round((perf * 0.7 + comp * 0.3) * 100) / 100;
  };

  // Phase1 #1: 저장 (markSubmitted 옵션)
  const handleSaveAll = async (markSubmitted: boolean) => {
    setSaving(true);
    try {
      if (markSubmitted) {
        for (let i=0; i<evaluatees.length; i++) {
          const emp = evaluatees[i];
          if (emp.id === user?.id) continue;
          const sc = getInlineScores(emp.id);
          const perf = calcScore(PERF, sc);
          const comp = calcScore(COMP, sc);
          const total = Math.round((perf * 0.7 + comp * 0.3) * 100) / 100;
          const existing = getFirstEval(emp.id);
          const data = { fileType: "evaluation_opinion", evaluator: {name:user?.name,department:user?.department,type:selectedRole==="first"?"1차평가자":"2차평가자"}, scores: sc, perfScore: Math.round(perf*100)/100, compScore: Math.round(comp*100)/100, totalScore: total, submitted: true, submittedAt: new Date().toISOString(), registeredVia: "web_app" };
          if (existing) {
            await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
          } else {
            await supabase.from("self_assessments").insert({employee_id: emp.id, content_json: data, uploaded_at: new Date().toISOString()});
          }
        }
        await loadData();
        return;
      }
      const entries = Object.entries(scores);
      if (entries.length === 0) { alert("변경된 점수가 없습니다"); setSaving(false); return; }
      for (let i=0; i<entries.length; i++) {
        const empId = entries[i][0];
        const sc = entries[i][1] as Record<string,number>;
        const perf = calcScore(PERF, sc);
        const comp = calcScore(COMP, sc);
        const total = Math.round((perf * 0.7 + comp * 0.3) * 100) / 100;
        const existing = getFirstEval(empId);
        const data = { fileType: "evaluation_opinion", evaluator: {name:user?.name,department:user?.department,type:selectedRole==="first"?"1차평가자":"2차평가자"}, scores: sc, perfScore: Math.round(perf*100)/100, compScore: Math.round(comp*100)/100, totalScore: total, submitted: existing?.content_json?.submitted === true ? true : false, registeredVia: "web_app" };
        if (existing) {
          await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
        } else {
          await supabase.from("self_assessments").insert({employee_id: empId, content_json: data, uploaded_at: new Date().toISOString()});
        }
      }
      alert(entries.length + "명의 평가 점수가 저장되었습니다.");
      await loadData();
    } catch(e) { console.error(e); alert("저장 중 오류"); } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!window.confirm("제출완료 후에는 수정할 수 없습니다. 제출하시겠습니까?")) return;
    await handleSaveAll(true);
    setSubmitStatus("submitted");
    alert("제출이 완료되었습니다.");
  };

  // Phase1 #1: 제출취소
  const handleCancelSubmit = async () => {
    if (!window.confirm("제출을 취소하시겠습니까?\n취소 후 수정 가능 상태로 전환됩니다.")) return;
    setSaving(true);
    try {
      const ft = selectedRole === "first" ? "evaluation_opinion" : selectedRole === "self" ? "self_assessment" : "department_evaluation";
      const targetList = selectedRole === "self" ? [user!] : evaluatees;
      for (let i=0; i<targetList.length; i++) {
        const emp = targetList[i];
        const existing = getEval(emp.id, ft);
        if (existing) {
          await supabase.from("self_assessments").update({content_json: {...existing.content_json, submitted: false}}).eq("id", existing.id);
        }
      }
      setSubmitStatus("draft");
      await loadData();
      alert("제출이 취소되었습니다. 다시 수정할 수 있습니다.");
    } catch(e) { console.error(e); alert("취소 중 오류"); } finally { setSaving(false); }
  };

  const handleSaveSelf = async (markSubmitted: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const existing = getSelfEval(user.id);
      const data: any = { fileType: "self_assessment", achievements: selfAchievements.filter(a=>a.trim()), submitted: markSubmitted, registeredVia: "web_app" };
      if (markSubmitted) data.submittedAt = new Date().toISOString();
      if (existing) {
        await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
      } else {
        await supabase.from("self_assessments").insert({employee_id: user.id, content_json: data, uploaded_at: new Date().toISOString()});
      }
      alert(markSubmitted ? "본인평가가 제출되었습니다." : "본인평가가 저장되었습니다.");
      await loadData();
    } catch(e) { console.error(e); alert("저장 중 오류"); } finally { setSaving(false); }
  };

  const handleSubmitSelf = async () => {
    if (!window.confirm("제출완료 후에는 수정할 수 없습니다. 제출하시겠습니까?")) return;
    await handleSaveSelf(true);
    setSubmitStatus("submitted");
  };

  const handleSaveDetail = async () => {
    if (!detailEmp) return;
    // Phase2 #13: 개선의견 50자 미만 차단
    if ((detailComment || "").trim().length < 50) {
      alert("개선사항 및 육성계획은 50자 이상 입력해야 저장됩니다.\n현재 " + (detailComment || "").length + "자");
      return;
    }
    setSaving(true);
    try {
      const perf = calcScore(PERF, detailScores);
      const comp = calcScore(COMP, detailScores);
      const total = Math.round((perf*0.7+comp*0.3)*100)/100;
      const existing = getFirstEval(detailEmp.id);
      const wasSubmitted = existing?.content_json?.submitted === true;
      const data = { fileType: "evaluation_opinion", evaluator: {name:user?.name,department:user?.department,type:"1차평가자"}, achievements: detailAchievements.filter(a=>a.trim()), scores: detailScores, perfScore: Math.round(perf*100)/100, compScore: Math.round(comp*100)/100, totalScore: total, comment: detailComment, submitted: wasSubmitted, registeredVia: "web_app" };
      if (existing) {
        await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
      } else {
        await supabase.from("self_assessments").insert({employee_id: detailEmp.id, content_json: data, uploaded_at: new Date().toISOString()});
      }
      alert(detailEmp.name + "님의 평가가 저장되었습니다.");
      setDetailEmp(null);
      await loadData();
    } catch(e) { console.error(e); alert("저장 중 오류"); } finally { setSaving(false); }
  };

  const openDetail = (emp: Emp) => {
    const ev = getFirstEval(emp.id);
    setDetailEmp(emp);
    if (ev && ev.content_json) {
      const ach = ev.content_json.achievements;
      setDetailAchievements(Array.isArray(ach) && ach.length > 0 ? (ach.length >= 3 ? ach : [...ach, ...Array(3-ach.length).fill("")]) : ["","",""]);
      setDetailScores(ev.content_json.scores || {delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0});
      setDetailComment(ev.content_json.comment || "");
    } else {
      const selfEv = getSelfEval(emp.id);
      if (selfEv && selfEv.content_json && Array.isArray(selfEv.content_json.achievements) && selfEv.content_json.achievements.length > 0) {
        const ach = selfEv.content_json.achievements;
        setDetailAchievements(ach.length >= 3 ? ach : [...ach, ...Array(3-ach.length).fill("")]);
      } else {
        setDetailAchievements(["","",""]);
      }
      setDetailScores({delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0});
      setDetailComment("");
    }
  };

  const handleSaveGrades = async (markSubmitted: boolean) => {
    setSaving(true);
    try {
      if (markSubmitted) {
        for (let i=0; i<evaluatees.length; i++) {
          const emp = evaluatees[i];
          const grade = grades[emp.id] || (getEval(emp.id, "department_evaluation")?.content_json?.finalGrade || "");
          if (!grade) continue;
          const existing = getEval(emp.id, "department_evaluation");
          const data = { fileType: "department_evaluation", deptName: user?.department, finalGrade: grade, evaluator: user?.name, submitted: true, submittedAt: new Date().toISOString(), registeredVia: "web_app" };
          if (existing) {
            await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
          } else {
            await supabase.from("self_assessments").insert({employee_id: emp.id, content_json: data, uploaded_at: new Date().toISOString()});
          }
        }
        await loadData();
        return;
      }
      const entries = Object.entries(grades).filter(([,v])=>v);
      if (entries.length === 0) { alert("등급을 부여해주세요"); setSaving(false); return; }
      for (let i=0; i<entries.length; i++) {
        const empId = entries[i][0];
        const grade = entries[i][1] as string;
        const existing = getEval(empId, "department_evaluation");
        const wasSubmitted = existing?.content_json?.submitted === true;
        const data = { fileType: "department_evaluation", deptName: user?.department, finalGrade: grade, evaluator: user?.name, submitted: wasSubmitted, registeredVia: "web_app" };
        if (existing) {
          await supabase.from("self_assessments").update({content_json: {...existing.content_json, ...data}}).eq("id", existing.id);
        } else {
          await supabase.from("self_assessments").insert({employee_id: empId, content_json: data, uploaded_at: new Date().toISOString()});
        }
      }
      alert(entries.length + "명의 등급이 저장되었습니다.");
      await loadData();
    } catch(e) { console.error(e); alert("저장 중 오류"); } finally { setSaving(false); }
  };

  const handleSubmitGrades = async () => {
    // Phase2 #17: 평가비율(상30/중40/하30) 검증
    const checkRatio = (list: Emp[], label: string): string | null => {
      if (list.length === 0) return null;
      const cnt: Record<string, number> = { "상": 0, "중": 0, "하": 0 };
      list.forEach(e => {
        const g = grades[e.id] || (getEval(e.id, "department_evaluation")?.content_json?.finalGrade || "");
        if (g === "상" || g === "중" || g === "하") cnt[g]++;
      });
      const need = { "상": Math.round(list.length * 0.3), "중": Math.round(list.length * 0.4), "하": Math.round(list.length * 0.3) };
      const msgs: string[] = [];
      (["상", "중", "하"] as const).forEach(k => {
        const diff = cnt[k] - need[k];
        if (Math.abs(diff) >= 1) msgs.push(`${k}: ${cnt[k]}명 (기준 ${need[k]}명, ${diff > 0 ? "+" : ""}${diff})`);
      });
      if (msgs.length > 0) return `[${label}] 비율 미준수:\n${msgs.join("\n")}`;
      return null;
    };
    const leaderList = evaluatees.filter(e => e.group_type === "팀장급");
    const memberList = evaluatees.filter(e => e.group_type === "팀원");
    const errs: string[] = [];
    const e1 = checkRatio(leaderList, "팀장이상"); if (e1) errs.push(e1);
    const e2 = checkRatio(memberList, "팀원"); if (e2) errs.push(e2);
    if (errs.length > 0) {
      alert("기준 비율(상30%/중40%/하30%)을 충족하지 못했습니다.\n\n" + errs.join("\n\n") + "\n\n등급 조정 후 다시 제출해주세요.");
      return;
    }
    if (!window.confirm("제출완료 후에는 수정할 수 없습니다. 제출하시겠습니까?")) return;
    await handleSaveGrades(true);
    setSubmitStatus("submitted");
    alert("제출이 완료되었습니다.");
  };

  // Phase2 #20: 정렬·필터된 2차 평가 리스트
  const sortedSecondList = useMemo(() => {
    const filtered = evaluatees.filter(emp =>
      groupFilter === "all" ? true :
      groupFilter === "제외" ? emp.is_evaluated === false :
      emp.group_type === groupFilter
    );
    if (!sortBy.col) return filtered;
    const valOf = (e: Emp): number | string => {
      if (sortBy.col === "name") return e.name || "";
      if (sortBy.col === "team") return e.team || "";
      if (sortBy.col === "group") return e.group_type || "";
      const v = getFirstEval(e.id);
      const ts = (v && v.content_json && v.content_json.totalScore) || 0;
      if (sortBy.col === "first") return ts;
      if (sortBy.col === "teamAvg") {
        // Phase3: 팀장급은 본부평균과 동일
        if (e.group_type === "팀장급") {
          const sd = evaluatees.filter(x => x.department === e.department && x.is_evaluated !== false && !isHonbujang(x));
          const ss = sd.map(x => { const vv = getFirstEval(x.id); return (vv && vv.content_json && vv.content_json.totalScore) || 0; }).filter(s => s > 0);
          return ss.length > 0 ? ss.reduce((a,b) => a + b, 0) / ss.length : 0;
        }
        const st = evaluatees.filter(x => x.team === e.team && x.is_evaluated !== false && !isHonbujang(x));
        const ss = st.map(x => { const vv = getFirstEval(x.id); return (vv && vv.content_json && vv.content_json.totalScore) || 0; }).filter(s => s > 0);
        return ss.length > 0 ? ss.reduce((a,b) => a + b, 0) / ss.length : 0;
      }
      if (sortBy.col === "deptAvg") {
        const sd = evaluatees.filter(x => x.department === e.department && x.is_evaluated !== false && !isHonbujang(x));
        const ss = sd.map(x => { const vv = getFirstEval(x.id); return (vv && vv.content_json && vv.content_json.totalScore) || 0; }).filter(s => s > 0);
        return ss.length > 0 ? ss.reduce((a,b) => a + b, 0) / ss.length : 0;
      }
      if (sortBy.col === "adjusted" || sortBy.col === "recommend") {
        const sg = evaluatees.filter(x => x.group_type === e.group_type && x.is_evaluated !== false);
        const ss = sg.map(x => { const vv = getFirstEval(x.id); return (vv && vv.content_json && vv.content_json.totalScore) || 0; }).filter(s => s > 0);
        const ga = ss.length > 0 ? ss.reduce((a,b) => a + b, 0) / ss.length : 0;
        const adj = ts && ga ? ts * (ts / ga) : 0;
        if (sortBy.col === "adjusted") return adj;
        if (!ts) return 99;
        const sorted = sg.map(x => { const vv = getFirstEval(x.id); const t = (vv && vv.content_json && vv.content_json.totalScore) || 0; return t && ga ? t * (t / ga) : 0; }).sort((a,b) => b - a);
        const rank = sorted.indexOf(adj) + 1;
        const pct = sg.length > 0 ? Math.round(rank / sg.length * 100) : 0;
        return pct <= 30 ? 1 : pct <= 70 ? 2 : 3;
      }
      if (sortBy.col === "final") {
        const g = grades[e.id] || ((getEval(e.id, "department_evaluation")?.content_json?.finalGrade) || "");
        return g === "상" ? 1 : g === "중" ? 2 : g === "하" ? 3 : 4;
      }
      return 0;
    };
    return [...filtered].sort((a, b) => {
      const av = valOf(a), bv = valOf(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortBy.asc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = typeof av === "number" ? av : 0;
      const bn = typeof bv === "number" ? bv : 0;
      return sortBy.asc ? an - bn : bn - an;
    });
  }, [evaluatees, groupFilter, sortBy, evals, grades]);

  const gradeStats = useMemo(() => {
    const l = evaluatees.filter(e=>e.group_type==="팀장급");
    const m = evaluatees.filter(e=>e.group_type==="팀원");
    const cnt = (list:Emp[],g:string) => list.filter(e=>(grades[e.id]||(getEval(e.id,"department_evaluation")?.content_json?.finalGrade))=== g).length;
    return {
      leaders:{total:l.length,상:{t:Math.round(l.length*0.3),a:cnt(l,"상")},중:{t:Math.round(l.length*0.4),a:cnt(l,"중")},하:{t:Math.round(l.length*0.3),a:cnt(l,"하")}},
      members:{total:m.length,상:{t:Math.round(m.length*0.3),a:cnt(m,"상")},중:{t:Math.round(m.length*0.4),a:cnt(m,"중")},하:{t:Math.round(m.length*0.3),a:cnt(m,"하")}},
    };
  }, [evaluatees, grades, evals]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">로그인이 필요합니다</p></div>;

  return (
    <div className="min-h-screen bg-light">
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/dashboard" className="flex items-center space-x-2 text-secondary hover:text-primary transition">
            <ArrowLeft size={20}/><span>대시보드</span>
          </Link>
          {isReadOnly && <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">제출완료 (수정불가)</span>}
        </div>
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">대상조직</h3>
              <select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary focus:outline-none">
                {availableOrgs.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">평가권한</h3>
              <div className="space-y-2">
                {availableRoles.map(r=>(<button key={r.value} onClick={()=>setSelectedRole(r.value)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${selectedRole===r.value?"bg-secondary text-white":"bg-light text-gray-700 hover:bg-gray-200"}`}>{r.label}</button>))}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary mb-4">{selectedRole==="self"?"본인평가":selectedRole==="first"?"1차 평가자 화면":selectedRole==="second"?"2차 평가자 화면":"CEO 최종승인"}</h1>
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-500 mb-3">평가진행 현황</h3>
              <div className="grid grid-cols-6 gap-4 text-center text-sm">
                <div><p className="text-gray-500">전체인원</p><p className="text-2xl font-bold text-primary">{selectedRole==="self"?"-":stats.total}</p></div>
                <div><p className="text-gray-500">평가대상</p><p className="text-2xl font-bold text-primary">{selectedRole==="self"?"-":stats.target}</p></div>
                <div><p className="text-gray-500">진행중</p><p className="text-2xl font-bold text-yellow-600">{selectedRole==="self"?"-":stats.inProgress}</p></div>
                <div><p className="text-gray-500">제출완료</p><p className="text-2xl font-bold text-green-600">{selectedRole==="self"?(submitStatus==="submitted"?"1":"0"):stats.completed}</p></div>
                <div><p className="text-gray-500">평균점수</p><p className="text-2xl font-bold text-secondary">{selectedRole==="self"?"-":stats.avgScore}</p></div>
                <div><p className="text-gray-500">진행상태</p><p className={`text-lg font-bold ${stats.status==="제출완료"?"text-green-600":stats.status==="진행 중"?"text-yellow-600":"text-gray-400"}`}>{selectedRole==="self"?(submitStatus==="submitted"?"제출완료":"미진행"):stats.status}</p></div>
              </div>
            </div>

            {selectedRole === "self" && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-primary mb-4">주요 성과</h2>
                <p className="text-sm text-gray-500 mb-4">본인의 주요성과를 기재해주세요 (최소 1건)</p>
                {selfAchievements.map((a,i)=>(<div key={i} className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">성과 {i+1}</label><textarea value={a} onChange={e=>{if(isReadOnly)return;const n=[...selfAchievements];n[i]=e.target.value;setSelfAchievements(n);}} rows={3} readOnly={isReadOnly} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary focus:outline-none ${isReadOnly?"bg-gray-100":""}`} placeholder="성과 내용을 입력하세요..."/></div>))}
                {!isReadOnly && <button onClick={()=>setSelfAchievements([...selfAchievements,""])} className="text-secondary text-sm font-medium mb-4">+ 성과 추가</button>}
                <div className="flex space-x-3 mt-4">
                  {isReadOnly ? (
                    <button onClick={handleCancelSubmit} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"><RotateCcw size={16}/><span>제출취소</span></button>
                  ) : (
                    <>
                      <button onClick={()=>handleSaveSelf(false)} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"><Save size={16}/><span>등록저장</span></button>
                      <button onClick={handleSubmitSelf} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"><Send size={16}/><span>제출완료</span></button>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedRole === "first" && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-primary">평가등록 현황</h2>
                  <div className="flex space-x-3">
                    {isReadOnly ? (
                      <button onClick={handleCancelSubmit} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-50"><RotateCcw size={14}/><span>제출취소</span></button>
                    ) : (
                      <>
                        <button onClick={()=>handleSaveAll(false)} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-50"><Save size={14}/><span>등록저장</span></button>
                        <button onClick={handleSubmit} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-50"><Send size={14}/><span>제출완료</span></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-light">
                      <tr>
                        <th colSpan={6} className="px-2 py-2 text-center border-b border-r font-bold text-primary">평가대상자 정보</th>
                        <th className="px-2 py-2 text-center border-b border-r font-bold text-blue-600">본인평가</th>
                        <th colSpan={4} className="px-2 py-2 text-center border-b border-r font-bold text-primary">성과평가 (70%)</th>
                        <th colSpan={4} className="px-2 py-2 text-center border-b border-r font-bold text-primary">역량평가 (30%)</th>
                        <th className="px-2 py-2 text-center border-b border-r font-bold text-secondary">종합</th>
                        <th className="px-2 py-2 text-center border-b font-bold text-gray-600">순위</th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1 text-left border-b">본부</th><th className="px-2 py-1 text-left border-b">실</th><th className="px-2 py-1 text-left border-b">팀</th>
                        <th className="px-2 py-1 text-left border-b">성명</th><th className="px-2 py-1 text-center border-b">그룹</th><th className="px-2 py-1 text-center border-b border-r">입사일</th>
                        <th className="px-2 py-1 text-center border-b border-r">등록</th>
                        <th className="px-2 py-1 text-center border-b">납기</th><th className="px-2 py-1 text-center border-b">품질</th><th className="px-2 py-1 text-center border-b">효율</th><th className="px-2 py-1 text-center border-b border-r">합계</th>
                        <th className="px-2 py-1 text-center border-b">리더십</th><th className="px-2 py-1 text-center border-b">성장</th><th className="px-2 py-1 text-center border-b">윤리</th><th className="px-2 py-1 text-center border-b border-r">합계</th>
                        <th className="px-2 py-1 text-center border-b border-r">점수</th>
                        <th className="px-2 py-1 text-center border-b">순위</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatees.map((emp) => {
                        const s = getInlineScores(emp.id);
                        const perfTotal = Math.round(calcScore(PERF, s)*100)/100;
                        const compTotal = Math.round(calcScore(COMP, s)*100)/100;
                        const total = getInlineTotal(emp.id);
                        const selfEv = getSelfEval(emp.id);
                        const sameGroupList = evaluatees.filter(e=>e.group_type===emp.group_type);
                        const sortedTotals = sameGroupList.map(e=>getInlineTotal(e.id)).sort((a,b)=>b-a);
                        const rank = sortedTotals.indexOf(total) + 1;
                        const groupCount = sameGroupList.length;
                        return (
                          <tr key={emp.id} className="border-b border-gray-100 hover:bg-blue-50">
                            <td className="px-2 py-2 text-xs">{emp.department}</td>
                            <td className="px-2 py-2 text-xs">{emp.division||"-"}</td>
                            <td className="px-2 py-2 text-xs">{emp.team}</td>
                            <td className="px-2 py-2"><button onClick={()=>openDetail(emp)} className="text-secondary hover:text-primary font-bold underline">{emp.name}</button></td>
                            <td className="px-2 py-2 text-center"><span className={`px-1 py-0.5 rounded text-xs ${emp.group_type==="팀장급"?"bg-purple-100 text-purple-700":"bg-blue-100 text-blue-700"}`}>{emp.group_type}</span></td>
                            <td className="px-2 py-2 text-center border-r text-xs text-gray-500">{emp.created_at?emp.created_at.slice(0,7):"-"}</td>
                            <td className="px-2 py-2 text-center border-r">{selfEv?<span className="text-green-600 font-bold text-xs">등록완료</span>:<span className="text-red-500 text-xs">미등록</span>}</td>
                            {PERF.map(p=>(<td key={p.k} className="px-1 py-1 text-center"><select value={s[p.k]??0} onChange={e=>setInlineScore(emp.id,p.k,Number(e.target.value))} disabled={isReadOnly} className="w-14 text-center text-xs border border-gray-300 rounded py-1 disabled:bg-gray-100"><option value={0}>선택없음</option>{[1,2,3,4,5,6,7].map(v=>(<option key={v} value={v}>{v}</option>))}</select></td>))}
                            <td className="px-2 py-2 text-center border-r font-bold text-xs">{perfTotal}</td>
                            {COMP.map(p=>(<td key={p.k} className="px-1 py-1 text-center"><select value={s[p.k]??0} onChange={e=>setInlineScore(emp.id,p.k,Number(e.target.value))} disabled={isReadOnly} className="w-14 text-center text-xs border border-gray-300 rounded py-1 disabled:bg-gray-100"><option value={0}>선택없음</option>{[1,2,3,4,5,6,7].map(v=>(<option key={v} value={v}>{v}</option>))}</select></td>))}
                            <td className="px-2 py-2 text-center border-r font-bold text-xs">{compTotal}</td>
                            <td className="px-2 py-2 text-center border-r font-bold text-secondary">{total}</td>
                            <td className="px-2 py-2 text-center text-xs text-gray-600">{rank}/{groupCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(selectedRole === "second" || selectedRole === "ceo") && (
              <div className="space-y-4">
                {/* Phase2 #15, #16: 평균점수/조정점수 산식 카드 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">📊 평균점수 산식</h3>
                    <div className="bg-blue-50 rounded p-2 text-xs font-mono mb-2">평균점수 = Σ(개인 종합점수) ÷ N<br/><span className="text-gray-500">※ 미등록(0점)자 제외</span></div>
                    <div className="text-xs text-gray-600">전체 평균: <span className="font-bold text-blue-600 text-base">{stats.avgScore || "-"}</span> 점 ({stats.completed + stats.inProgress}명 기준)</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">📈 조정점수 산식</h3>
                    <div className="bg-purple-50 rounded p-2 text-xs font-mono mb-2">조정점수 = 종합점수 × (종합점수 ÷ 그룹평균)<br/><span className="text-gray-500">※ 직책분류(팀장급/팀원)별 그룹 기준</span></div>
                    <div className="text-xs text-gray-600">상위 30% → "상" · 중간 40% → "중" · 하위 30% → "하"</div>
                  </div>
                </div>
                {/* Phase2 #18: 등급-비고 매핑 가이드 */}
                <div className="bg-white rounded-lg shadow p-3 border-l-4 border-amber-500">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">🔗 등급 ↔ 비고(조정요청) 매핑</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span><span className="inline-block w-5 h-5 rounded bg-green-500 text-white text-center font-bold mr-1">상</span> → 비고: <span className="font-bold text-green-700">S추천</span> 또는 <span className="font-bold text-green-700">A추천</span></span>
                    <span><span className="inline-block w-5 h-5 rounded bg-yellow-500 text-white text-center font-bold mr-1">중</span> → 비고: <span className="text-gray-500">(없음)</span></span>
                    <span><span className="inline-block w-5 h-5 rounded bg-red-500 text-white text-center font-bold mr-1">하</span> → 비고: <span className="font-bold text-red-700">D부여</span></span>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-3">상대평가 비율</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(["leaders","members"] as const).map(g=>(<div key={g} className="border rounded-lg p-3"><h4 className="font-bold text-primary text-sm mb-2">{g==="leaders"?"팀장이상":"팀원"} ({gradeStats[g].total}명)</h4><table className="w-full text-xs"><thead><tr className="border-b"><th className="text-left py-1">등급</th><th className="text-center py-1">비율</th><th className="text-center py-1">기준</th><th className="text-center py-1">부여</th><th className="text-center py-1">차이</th></tr></thead><tbody>{(["상","중","하"] as const).map(gr=>{const s=gradeStats[g][gr];const d=s.t-s.a;return(<tr key={gr} className="border-b"><td className={`py-1 font-bold ${gr==="상"?"text-green-600":gr==="중"?"text-yellow-600":"text-red-600"}`}>{gr}</td><td className="text-center">{gr==="상"?"30%":gr==="중"?"40%":"30%"}</td><td className="text-center">{s.t}명</td><td className="text-center font-bold">{s.a}명</td><td className={`text-center font-bold ${d===0?"text-green-600":d>0?"text-blue-600":"text-red-600"}`}>{d>0?"+"+d:d}</td></tr>);})}</tbody></table></div>))}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center space-x-4"><h2 className="text-lg font-bold text-primary">등급 부여</h2>
                      <div className="flex space-x-2">{[{v:"all",l:"전체"},{v:"팀장급",l:"팀장이상"},{v:"팀원",l:"팀원"},{v:"제외",l:"평가제외"}].map(f=>(<button key={f.v} onClick={()=>setGroupFilter(f.v)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${groupFilter===f.v?"bg-primary text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{f.l}</button>))}</div>
                      <button onClick={()=>setShowDetailCols(!showDetailCols)} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">{showDetailCols?"상세 숨기기":"상세 펼치기"}</button>
                    </div>
                    <div className="flex space-x-3">
                      {isReadOnly ? (
                        <button onClick={handleCancelSubmit} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50"><RotateCcw size={14}/><span>제출취소</span></button>
                      ) : (
                        <>
                          <button onClick={()=>handleSaveGrades(false)} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm disabled:opacity-50"><Save size={14}/><span>등록저장</span></button>
                          <button onClick={handleSubmitGrades} disabled={saving} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"><Send size={14}/><span>제출완료</span></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-light"><tr>
                    <th onClick={()=>toggleSort("name")} className="text-left px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">성명{sortArrow("name")}</th>
                    <th onClick={()=>toggleSort("team")} className="text-left px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">팀{sortArrow("team")}</th>
                    <th onClick={()=>toggleSort("group")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">직책분류{sortArrow("group")}</th>
                    {showDetailCols&&<><th className="text-center px-2 py-2">납기</th><th className="text-center px-2 py-2">품질</th><th className="text-center px-2 py-2">효율</th><th className="text-center px-2 py-2">리더십</th><th className="text-center px-2 py-2">성장</th><th className="text-center px-2 py-2">윤리</th><th className="text-center px-2 py-2">연봉</th></>}
                    <th onClick={()=>toggleSort("first")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">1차평가{sortArrow("first")}</th>
                    <th onClick={()=>toggleSort("teamAvg")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">팀평균{sortArrow("teamAvg")}</th>
                    <th onClick={()=>toggleSort("deptAvg")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">본부평균{sortArrow("deptAvg")}</th>
                    <th onClick={()=>toggleSort("adjusted")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">조정점수{sortArrow("adjusted")}</th>
                    <th onClick={()=>toggleSort("recommend")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">권장등급{sortArrow("recommend")}</th>
                    <th onClick={()=>toggleSort("final")} className="text-center px-3 py-2 cursor-pointer hover:bg-gray-200 select-none">최종등급{sortArrow("final")}</th>
                    <th className="text-center px-3 py-2">조정요청</th>
                  </tr></thead>
                    <tbody>{sortedSecondList.map(emp=>{
                      const ev = getFirstEval(emp.id);
                      const sc = (ev?.content_json?.scores)||{};
                      const ts = ev?.content_json?.totalScore || 0;
                      // Phase2 #19: 0점은 평균 계산 제외
                      const sameGroup = evaluatees.filter(e=>e.group_type===emp.group_type&&e.is_evaluated!==false);
                      const validScores = sameGroup.map(e=>{const v=getFirstEval(e.id);return v?.content_json?.totalScore||0;}).filter(s=>s>0);
                      const groupAvg = validScores.length>0 ? validScores.reduce((a,b)=>a+b,0)/validScores.length : 0;
                      // 본부평균(같은 department) - 0점 제외
                      const sameDept = evaluatees.filter(e=>e.department===emp.department&&e.is_evaluated!==false&&!isHonbujang(e));
                      const deptScores = sameDept.map(e=>{const v=getFirstEval(e.id);return v?.content_json?.totalScore||0;}).filter(s=>s>0);
                      const deptAvg = deptScores.length>0 ? deptScores.reduce((a,b)=>a+b,0)/deptScores.length : 0;
                      // 팀평균(같은 team) - 0점 제외. Phase3: 팀장급은 본부평균과 동일
                      let teamAvg = 0;
                      if (emp.group_type === "팀장급") {
                        teamAvg = deptAvg;
                      } else {
                        const sameTeam = evaluatees.filter(e=>e.team===emp.team&&e.is_evaluated!==false&&!isHonbujang(e));
                        const teamScores = sameTeam.map(e=>{const v=getFirstEval(e.id);return v?.content_json?.totalScore||0;}).filter(s=>s>0);
                        teamAvg = teamScores.length>0 ? teamScores.reduce((a,b)=>a+b,0)/teamScores.length : 0;
                      }
                      // 조정점수는 그룹(직책분류) 평균 기준
                      const adjustedScore = ts && groupAvg ? Math.round(ts*(ts/groupAvg)*10)/10 : 0;
                      const sortedScores = sameGroup.map(e=>{const v=getFirstEval(e.id);const t=v?.content_json?.totalScore||0;return t&&groupAvg?t*(t/groupAvg):0;}).sort((a,b)=>b-a);
                      const rank = sortedScores.indexOf(adjustedScore)+1;
                      const pct = sameGroup.length>0?Math.round(rank/sameGroup.length*100):0;
                      const recommendGrade = pct<=30?"상":pct<=70?"중":"하";
                      const existingGrade = getEval(emp.id,"department_evaluation")?.content_json?.finalGrade;
                      const currentGrade = grades[emp.id] || existingGrade || "";
                      const currentAdj = adjustRequest[emp.id] || "";
                      return(<tr key={emp.id} className="border-b hover:bg-blue-50">
                        <td className="px-3 py-2"><button onClick={()=>{setSecondDetailEmp(emp);setSecondDetailScores(sc.delivery?sc:{delivery:0,quality:0,efficiency:0,leadership:0,growth:0,ethics:0});setSecondDetailGrade(currentGrade);}} className="text-secondary hover:text-primary font-bold underline">{emp.name}</button></td>
                        <td className="px-3 py-2 text-gray-600">{emp.team}</td><td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${emp.group_type==="팀장급"?"bg-purple-100 text-purple-700":"bg-blue-100 text-blue-700"}`}>{emp.group_type}</span></td>
                        {showDetailCols&&<><td className="px-2 py-2 text-center">{sc.delivery||"-"}</td><td className="px-2 py-2 text-center">{sc.quality||"-"}</td><td className="px-2 py-2 text-center">{sc.efficiency||"-"}</td><td className="px-2 py-2 text-center">{sc.leadership||"-"}</td><td className="px-2 py-2 text-center">{sc.growth||"-"}</td><td className="px-2 py-2 text-center">{sc.ethics||"-"}</td><td className="px-2 py-2 text-center text-gray-400">-</td></>}
                        <td className="px-3 py-2 text-center font-bold">{ts||"-"}</td><td className="px-3 py-2 text-center">{teamAvg?Math.round(teamAvg*10)/10:"-"}</td><td className="px-3 py-2 text-center">{deptAvg?Math.round(deptAvg*10)/10:"-"}</td><td className="px-3 py-2 text-center font-bold">{adjustedScore||"-"}</td>
                        <td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${ts?(recommendGrade==="상"?"bg-green-100 text-green-700":recommendGrade==="중"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"):"bg-gray-100 text-gray-400"}`}>{ts?recommendGrade:"-"}</span></td>
                        <td className="px-3 py-2 text-center"><div className="flex justify-center space-x-1">{["상","중","하"].map(g=>(<button key={g} onClick={()=>{if(isReadOnly)return;const ng=currentGrade===g?"":g;setGrades({...grades,[emp.id]:ng});if(ng==="하"&&!adjustRequest[emp.id])setAdjustRequest({...adjustRequest,[emp.id]:"D부여"});if(ng==="중"&&(adjustRequest[emp.id]==="D부여"||adjustRequest[emp.id]==="S추천"||adjustRequest[emp.id]==="A추천"))setAdjustRequest({...adjustRequest,[emp.id]:""});}} disabled={isReadOnly} className={`w-8 h-8 rounded font-bold text-xs transition ${currentGrade===g?(g==="상"?"bg-green-500 text-white":g==="중"?"bg-yellow-500 text-white":"bg-red-500 text-white"):"bg-gray-100 text-gray-500 hover:bg-gray-200"} disabled:opacity-60 disabled:cursor-not-allowed`}>{g}</button>))}</div></td>
                        <td className="px-3 py-2 text-center"><select value={currentAdj} onChange={e=>{if(isReadOnly)return;setAdjustRequest({...adjustRequest,[emp.id]:e.target.value});}} disabled={isReadOnly} className="w-20 text-xs border border-gray-300 rounded py-1 disabled:bg-gray-100"><option value="">-</option><option value="S추천">S추천</option><option value="A추천">A추천</option><option value="D부여">D부여</option></select></td>
                      </tr>);
                    })}</tbody></table></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {secondDetailEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={()=>setSecondDetailEmp(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-xl"><h2 className="text-xl font-bold text-primary">{secondDetailEmp.name} 평가 상세</h2><button onClick={()=>setSecondDetailEmp(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-3 text-sm"><div className="bg-light p-2 rounded"><span className="text-gray-500">본부</span><p className="font-medium">{secondDetailEmp.department}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">팀</span><p className="font-medium">{secondDetailEmp.team}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">직책</span><p className="font-medium">{secondDetailEmp.title}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">그룹</span><p className="font-medium">{secondDetailEmp.group_type}</p></div></div>
              {(()=>{const ev=getFirstEval(secondDetailEmp.id);if(!ev) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"><p className="text-yellow-700 text-sm font-bold">1차 평가 미등록</p></div>;const c=ev.content_json;return(<div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="font-bold text-amber-700 text-sm mb-2">1차 평가 결과 (평가자: {c.evaluator?.name||"-"})</p>
                  {c.achievements&&c.achievements.length>0&&<div className="mb-3">{c.achievements.map((a:string,i:number)=>(<p key={i} className="text-xs text-gray-700 mb-1">• {a.substring(0,100)}{a.length>100?"...":""}</p>))}</div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded p-3"><p className="text-xs text-gray-500 mb-2">성과평가</p><div className="flex justify-between text-xs"><span>납기: {c.scores?.delivery||"-"}</span><span>품질: {c.scores?.quality||"-"}</span><span>효율: {c.scores?.efficiency||"-"}</span></div><p className="font-bold text-primary mt-1">합계: {c.perfScore||"-"}</p></div>
                    <div className="bg-white rounded p-3"><p className="text-xs text-gray-500 mb-2">역량평가</p><div className="flex justify-between text-xs"><span>리더십: {c.scores?.leadership||"-"}</span><span>성장: {c.scores?.growth||"-"}</span><span>윤리: {c.scores?.ethics||"-"}</span></div><p className="font-bold text-primary mt-1">합계: {c.compScore||"-"}</p></div>
                  </div>
                  <div className="mt-3 bg-primary text-white rounded p-3 text-center"><span className="text-sm">종합점수</span><p className="text-3xl font-bold">{c.totalScore||"-"}</p></div>
                  {c.comment&&<div className="mt-2 bg-white rounded p-2"><p className="text-xs text-gray-500">개선사항/육성계획</p><p className="text-xs text-gray-700">{c.comment}</p></div>}
                </div>
              </div>);})()}
              <div className="border-2 border-primary rounded-lg p-4">
                <h3 className="font-bold text-primary mb-3">2차 평가 (등급 부여)</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1"><p className="text-sm text-gray-600 mb-2">최종등급</p><div className="flex space-x-2">{["상","중","하"].map(g=>(<button key={g} onClick={()=>{if(isReadOnly)return;const ng=secondDetailGrade===g?"":g;setSecondDetailGrade(ng);setGrades({...grades,[secondDetailEmp.id]:ng});if(ng==="하"&&!adjustRequest[secondDetailEmp.id])setAdjustRequest({...adjustRequest,[secondDetailEmp.id]:"D부여"});if(ng==="중"&&(adjustRequest[secondDetailEmp.id]==="D부여"||adjustRequest[secondDetailEmp.id]==="S추천"||adjustRequest[secondDetailEmp.id]==="A추천"))setAdjustRequest({...adjustRequest,[secondDetailEmp.id]:""});}} disabled={isReadOnly} className={`w-12 h-12 rounded-lg font-bold text-lg transition ${secondDetailGrade===g?(g==="상"?"bg-green-500 text-white":g==="중"?"bg-yellow-500 text-white":"bg-red-500 text-white"):"bg-gray-100 text-gray-500 hover:bg-gray-200"} disabled:opacity-60`}>{g}</button>))}</div></div>
                  <div><p className="text-sm text-gray-600 mb-2">조정요청</p><select value={adjustRequest[secondDetailEmp.id]||""} onChange={e=>{if(isReadOnly)return;setAdjustRequest({...adjustRequest,[secondDetailEmp.id]:e.target.value});}} disabled={isReadOnly} className="border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"><option value="">-</option><option value="S추천">S추천</option><option value="A추천">A추천</option><option value="D부여">D부여</option></select></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl"><button onClick={()=>setSecondDetailEmp(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">닫기</button>{!isReadOnly&&<button onClick={()=>{handleSaveGrades(false);setSecondDetailEmp(null);}} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg text-sm disabled:opacity-50"><Save size={14}/><span>저장</span></button>}</div>
          </div>
        </div>
      )}

      {detailEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={()=>setDetailEmp(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-xl"><h2 className="text-xl font-bold text-primary">{detailEmp.name} 개인별 평가</h2><button onClick={()=>setDetailEmp(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-3 text-sm"><div className="bg-light p-2 rounded"><span className="text-gray-500">본부</span><p className="font-medium">{detailEmp.department}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">팀</span><p className="font-medium">{detailEmp.team}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">직책</span><p className="font-medium">{detailEmp.title}</p></div><div className="bg-light p-2 rounded"><span className="text-gray-500">그룹</span><p className="font-medium">{detailEmp.group_type}</p></div></div>
              {getSelfEval(detailEmp.id) && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"><div><p className="font-bold text-blue-700 text-sm">본인업적기술서 등록됨</p><p className="text-xs text-blue-600">{getSelfEval(detailEmp.id)?.content_json?.achievements?.length||0}건의 성과</p></div>{!isReadOnly&&<button onClick={()=>{const sa=getSelfEval(detailEmp.id)?.content_json;if(sa?.achievements){const a=sa.achievements;setDetailAchievements(a.length>=3?a:[...a,...Array(3-a.length).fill("")]);}}} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">불러오기</button>}</div>}
              <div><h3 className="text-sm font-bold text-gray-500 mb-2">주요 성과</h3>{detailAchievements.map((a,i)=>(<div key={i} className="mb-3"><label className="text-xs font-medium text-gray-600">성과 {i+1}</label><textarea value={a} onChange={e=>{if(isReadOnly)return;const n=[...detailAchievements];n[i]=e.target.value;setDetailAchievements(n);}} rows={2} readOnly={isReadOnly} className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${isReadOnly?"bg-gray-100":""}`}/></div>))}{!isReadOnly&&<button onClick={()=>setDetailAchievements([...detailAchievements,""])} className="text-secondary text-xs">+ 추가</button>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4"><h3 className="text-sm font-bold text-primary mb-3">성과평가 (70%)</h3>{PERF.map(p=>(<div key={p.k} className="flex items-center justify-between mb-2"><span className="text-sm">{p.l} ({p.w}%)</span><select value={detailScores[p.k]??0} onChange={e=>setDetailScores({...detailScores,[p.k]:Number(e.target.value)})} disabled={isReadOnly} className="w-20 text-center border rounded py-1 text-sm disabled:bg-gray-100"><option value={0}>선택없음</option>{[1,2,3,4,5,6,7].map(v=>(<option key={v} value={v}>{v}</option>))}</select></div>))}<div className="pt-2 border-t font-bold text-primary flex justify-between"><span>합계</span><span>{Math.round(calcScore(PERF,detailScores)*100)/100}</span></div></div>
                <div className="border rounded-lg p-4"><h3 className="text-sm font-bold text-primary mb-3">역량평가 (30%)</h3>{COMP.map(p=>(<div key={p.k} className="flex items-center justify-between mb-2"><span className="text-sm">{p.l} ({p.w}%)</span><select value={detailScores[p.k]??0} onChange={e=>setDetailScores({...detailScores,[p.k]:Number(e.target.value)})} disabled={isReadOnly} className="w-20 text-center border rounded py-1 text-sm disabled:bg-gray-100"><option value={0}>선택없음</option>{[1,2,3,4,5,6,7].map(v=>(<option key={v} value={v}>{v}</option>))}</select></div>))}<div className="pt-2 border-t font-bold text-primary flex justify-between"><span>합계</span><span>{Math.round(calcScore(COMP,detailScores)*100)/100}</span></div></div>
              </div>
              <div><h3 className="text-sm font-bold text-gray-500 mb-2">개선사항 및 육성계획 <span className="text-xs font-normal text-red-500">(50자 이상 필수)</span></h3><textarea value={detailComment} onChange={e=>{if(isReadOnly)return;setDetailComment(e.target.value);}} rows={3} readOnly={isReadOnly} className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${isReadOnly?"bg-gray-100":""}`} placeholder="개선사항 및 육성계획을 50자 이상 입력하세요..."/><p className={`text-xs mt-1 ${detailComment.length>=50?"text-green-600":"text-red-500"}`}>{detailComment.length}자 {detailComment.length>=50?"✓":"(50자 이상 필요)"}</p></div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl"><button onClick={()=>setDetailEmp(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">취소</button>{!isReadOnly&&<button onClick={handleSaveDetail} disabled={saving} className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg text-sm disabled:opacity-50"><Save size={14}/><span>저장</span></button>}</div>
          </div>
        </div>
      )}
    </div>
  );
}
