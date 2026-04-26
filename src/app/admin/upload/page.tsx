'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

declare global { interface Window { XLSX: any; } }

type FileType = 'self_assessment' | 'evaluation_opinion' | 'department_evaluation' | 'unknown';
interface ParsedPerson { name: string; department: string; team: string; position: string; fileType: FileType; sheetName: string; data: Record<string, any>; matchedEmployee?: Employee | null; }

const FILE_TYPE_LABELS: Record<FileType, string> = { self_assessment: '본인업적기술서', evaluation_opinion: '평가의견서', department_evaluation: '본부평가표', unknown: '알 수 없음' };
const FILE_TYPE_COLORS: Record<FileType, string> = { self_assessment: 'bg-blue-100 text-blue-700', evaluation_opinion: 'bg-amber-100 text-amber-700', department_evaluation: 'bg-green-100 text-green-700', unknown: 'bg-gray-100 text-gray-600' };

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPerson[]>([]);
  const [detectedType, setDetectedType] = useState<FileType>('unknown');
  const [fileName, setFileName] = useState('');
  const [uploadResult, setUploadResult] = useState<{matched: number; unmatched: number} | null>(null);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  useEffect(() => { loadData(); loadXLSX(); }, []);

  const loadXLSX = async () => {
    if (window.XLSX) { setXlsxLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => setXlsxLoaded(true);
    document.head.appendChild(script);
  };

  const loadData = async () => {
    try {
      const sessionId = document.cookie.split('; ').find((r) => r.startsWith('session_id='))?.split('=')[1];
      if (!sessionId) { router.push('/'); return; }
      const { data: userData } = await supabase.from('employees').select('*').eq('id', sessionId).single();
      if (!userData || userData.role !== 'admin') { router.push('/dashboard'); return; }
      setUser(userData);
      const { data: emps } = await supabase.from('employees').select('*').order('name');
      if (emps) setEmployees(emps);
      const { data: pds } = await supabase.from('evaluation_periods').select('*').order('created_at', { ascending: false });
      if (pds) { setPeriods(pds); if (pds.length > 0) setSelectedPeriod(pds[0].id); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const findEmployee = (name: string, dept: string, team: string): Employee | null => {
    if (!name) return null;
    const n = name.trim();
    let match = employees.find((e) => e.name === n && e.department === dept && e.team === team);
    if (!match) match = employees.find((e) => e.name === n && e.department === dept);
    if (!match) match = employees.find((e) => e.name === n);
    return match || null;
  };

  const getCellValue = (ws: any, addr: string): string => {
    const cell = ws[addr];
    return cell ? String(cell.v || '').trim() : '';
  };

  const findRowByText = (ws: any, searchText: string, col: string = 'B'): number => {
    const range = window.XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[window.XLSX.utils.encode_cell({r, c: col === 'B' ? 1 : col === 'D' ? 3 : 0})];
      if (cell && String(cell.v || '').includes(searchText)) return r + 1;
    }
    return -1;
  };

  const detectFileType = (wb: any): FileType => {
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const sheetName = wb.SheetNames[0] || '';
    if (sheetName.includes('본인업적기술서')) return 'self_assessment';
    const b3 = getCellValue(firstSheet, 'B3');
    if (b3.includes('인사평가 의견서') || getCellValue(firstSheet, 'B4').includes('평가자')) return 'evaluation_opinion';
    const a15 = getCellValue(firstSheet, 'A15');
    if (a15.includes('순번') || getCellValue(firstSheet, 'B15') === '성명') return 'department_evaluation';
    if (getCellValue(firstSheet, 'B2').includes('본인업적기술서')) return 'self_assessment';
    if (getCellValue(firstSheet, 'E6').includes('평가자')) return 'evaluation_opinion';
    return 'unknown';
  };

  const parseSelfAssessment = (ws: any, sheetName: string): ParsedPerson => {
    const name = getCellValue(ws, 'C3');
    const dept = getCellValue(ws, 'E3');
    const team = getCellValue(ws, 'I3');
    const position = getCellValue(ws, 'C4');
    const achievements: string[] = [];
    for (let i = 8; i <= 20; i++) {
      const marker = getCellValue(ws, `B${i}`);
      if (marker.match(/^\d+\.?$/) || marker.match(/^\d+$/)) {
        const val = getCellValue(ws, `C${i}`);
        if (val) achievements.push(val);
      }
      if (getCellValue(ws, `B${i}`).includes('겸직조직')) break;
    }
    const concurrentAchievements: string[] = [];
    const concurrentRow = findRowByText(ws, '겸직조직');
    if (concurrentRow > 0) {
      for (let i = concurrentRow + 1; i <= concurrentRow + 5; i++) {
        const val = getCellValue(ws, `C${i}`);
        if (val && getCellValue(ws, `B${i}`).match(/^\d/)) concurrentAchievements.push(val);
      }
    }
    return { name, department: dept, team, position, fileType: 'self_assessment', sheetName, data: { achievements, concurrentAchievements, concurrent: getCellValue(ws, 'A5') !== '해당없음' ? false : false }, matchedEmployee: findEmployee(name, dept, team) };
  };

  const parseEvaluationOpinion = (ws: any, sheetName: string): ParsedPerson => {
    const evaluatorName = getCellValue(ws, 'C5');
    const evaluatorDept = getCellValue(ws, 'E5');
    const evaluatorType = getCellValue(ws, 'E6');
    const name = getCellValue(ws, 'C9');
    const dept = getCellValue(ws, 'E9');
    const team = getCellValue(ws, 'I9');
    const position = getCellValue(ws, 'C10');
    const concurrent = getCellValue(ws, 'G10') === 'O';
    const achievements: string[] = [];
    for (let i = 13; i <= 25; i++) {
      const marker = getCellValue(ws, `B${i}`);
      if (marker.match(/^\d+\.?$/)) {
        const val = getCellValue(ws, `C${i}`);
        if (val) achievements.push(val);
      }
      if (getCellValue(ws, `B${i}`).includes('겸직조직') || getCellValue(ws, `B${i}`).includes('성과평가')) break;
    }
    const scores: Record<string, number> = {};
    const range = window.XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = 0; r <= range.e.r; r++) {
      const bCell = ws[window.XLSX.utils.encode_cell({r, c: 1})];
      const dCell = ws[window.XLSX.utils.encode_cell({r, c: 3})];
      const label = String(bCell?.v || dCell?.v || '');
      const hCell = ws[window.XLSX.utils.encode_cell({r, c: 7})];
      if (hCell && typeof hCell.v === 'number') {
        if (label.includes('납기')) scores.delivery = hCell.v;
        else if (label.includes('품질')) scores.quality = hCell.v;
        else if (label.includes('효율')) scores.efficiency = hCell.v;
        else if (label.includes('리더십')) scores.leadership = hCell.v;
        else if (label.includes('성장')) scores.growth = hCell.v;
        else if (label.includes('윤리')) scores.ethics = hCell.v;
      }
    }
    const perfScore = ((scores.delivery||0)*35 + (scores.quality||0)*35 + (scores.efficiency||0)*30) / 7;
    const compScore = ((scores.leadership||0)*35 + (scores.growth||0)*35 + (scores.ethics||0)*30) / 7;
    const totalScore = perfScore * 0.7 + compScore * 0.3;
    return { name, department: dept, team, position, fileType: 'evaluation_opinion', sheetName, data: { evaluator: { name: evaluatorName, department: evaluatorDept, type: evaluatorType }, achievements, concurrent, scores, perfScore: Math.round(perfScore * 100) / 100, compScore: Math.round(compScore * 100) / 100, totalScore: Math.round(totalScore * 100) / 100 }, matchedEmployee: findEmployee(name, dept, team) };
  };

  const parseDeptEvaluation = (ws: any, sheetName: string): ParsedPerson[] => {
    const deptName = getCellValue(ws, 'C1');
    const results: ParsedPerson[] = [];
    for (let r = 16; r <= 50; r++) {
      const name = getCellValue(ws, `B${r}`);
      if (!name) break;
      const dept = getCellValue(ws, `C${r}`) || deptName;
      const team = getCellValue(ws, `E${r}`);
      const position = getCellValue(ws, `F${r}`);
      const groupType = getCellValue(ws, `G${r}`);
      const pCell = ws[`P${r}`]; const qCell = ws[`Q${r}`]; const rCell = ws[`R${r}`];
      const tCell = ws[`T${r}`]; const uCell = ws[`U${r}`]; const vCell = ws[`V${r}`];
      const adCell = ws[`AD${r}`];
      const scores = {
        delivery: pCell?.v || 0, quality: qCell?.v || 0, efficiency: rCell?.v || 0,
        leadership: tCell?.v || 0, growth: uCell?.v || 0, ethics: vCell?.v || 0,
      };
      const finalGrade = adCell ? String(adCell.v || '') : '';
      results.push({ name, department: dept, team, position, fileType: 'department_evaluation', sheetName, data: { groupType, scores, finalGrade, deptName }, matchedEmployee: findEmployee(name, dept, team) });
    }
    return results;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!xlsxLoaded) { alert('엑셀 파서를 로딩 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    setFileName(file.name);
    setUploadResult(null);
    setParsedData([]);
    try {
      const data = await file.arrayBuffer();
      const wb = window.XLSX.read(data, { type: 'array' });
      const type = detectFileType(wb);
      setDetectedType(type);
      const parsed: ParsedPerson[] = [];
      if (type === 'self_assessment') {
        const ws = wb.Sheets[wb.SheetNames[0]];
        parsed.push(parseSelfAssessment(ws, wb.SheetNames[0]));
      } else if (type === 'evaluation_opinion') {
        for (const sn of wb.SheetNames) {
          const ws = wb.Sheets[sn];
          if (getCellValue(ws, 'C9') || getCellValue(ws, 'C5')) {
            parsed.push(parseEvaluationOpinion(ws, sn));
          }
        }
      } else if (type === 'department_evaluation') {
        const ws = wb.Sheets[wb.SheetNames[0]];
        parsed.push(...parseDeptEvaluation(ws, wb.SheetNames[0]));
      } else {
        alert('파일 유형을 인식할 수 없습니다. 본인업적기술서, 평가의견서, 본부평가표 중 하나를 업로드해주세요.');
        return;
      }
      setParsedData(parsed);
    } catch (err) {
      console.error(err);
      alert('파일 파싱 중 오류가 발생했습니다. 암호화된 파일은 암호 해제 후 업로드해주세요.');
    }
  }, [xlsxLoaded, employees]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleSave = async () => {
    if (!selectedPeriod) { alert('평가 기간을 선택해주세요'); return; }
    const matched = parsedData.filter((p) => p.matchedEmployee);
    if (matched.length === 0) { alert('매칭된 구성원이 없습니다'); return; }
    setUploading(true);
    try {
      const inserts = matched.map((p) => ({
        employee_id: p.matchedEmployee!.id,
        period_id: selectedPeriod,
        content_json: { fileType: p.fileType, ...p.data },
        uploaded_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('self_assessments').insert(inserts);
      if (error) throw error;
      setUploadResult({ matched: matched.length, unmatched: parsedData.length - matched.length });
    } catch (err) { console.error(err); alert('업로드 중 오류가 발생했습니다'); } finally { setUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">관리자 권한이 필요합니다</p></div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/admin" className="flex items-center space-x-2 text-secondary hover:text-primary transition"><ArrowLeft size={20} /><span>돌아가기</span></Link>
      </div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-primary mb-2">평가 파일 업로드</h1><p className="text-gray-600">본인업적기술서, 평가의견서, 본부평가표를 업로드합니다</p></div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">평가 기간</label>
        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary">
          <option value="">평가 기간 선택</option>
          {periods.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-8 mb-6" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-secondary transition">
          <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-2">Excel 파일 업로드</p>
          <p className="text-sm text-gray-500 mb-4">드래그하여 놓거나 클릭하여 선택</p>
          <input type="file" accept=".xlsx,.xls" className="hidden" id="fileInput" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          <label htmlFor="fileInput" className="inline-block px-6 py-3 bg-secondary text-white rounded-lg cursor-pointer hover:bg-opacity-90 transition font-medium">파일 선택</label>
          <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-gray-500">
            <div className="p-3 bg-blue-50 rounded-lg"><span className="font-bold text-blue-700">📄 본인업적기술서</span><br/>팀원 성과 기술</div>
            <div className="p-3 bg-amber-50 rounded-lg"><span className="font-bold text-amber-700">📋 평가의견서</span><br/>1차 평가자 의견+점수</div>
            <div className="p-3 bg-green-50 rounded-lg"><span className="font-bold text-green-700">📊 본부평가표</span><br/>2차 평가자 등급</div>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-primary">파싱 결과</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${FILE_TYPE_COLORS[detectedType]}`}>{FILE_TYPE_LABELS[detectedType]}</span>
            </div>
            <p className="text-sm text-gray-600">{fileName} · {parsedData.length}명</p>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-light"><tr><th className="text-left px-4 py-2">이름</th><th className="text-left px-4 py-2">본부/팀</th>{detectedType === 'evaluation_opinion' && <><th className="text-left px-4 py-2">성과점수</th><th className="text-left px-4 py-2">역량점수</th><th className="text-left px-4 py-2">종합</th></>}{detectedType === 'department_evaluation' && <><th className="text-left px-4 py-2">직책분류</th><th className="text-left px-4 py-2">최종등급</th></>}<th className="text-left px-4 py-2">매칭</th></tr></thead>
            <tbody>{parsedData.map((p, i) => (<tr key={i} className="border-b border-gray-100 hover:bg-light"><td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3 text-gray-600">{p.department} / {p.team}</td>
              {detectedType === 'evaluation_opinion' && <><td className="px-4 py-3">{p.data.perfScore}</td><td className="px-4 py-3">{p.data.compScore}</td><td className="px-4 py-3 font-bold">{p.data.totalScore}</td></>}
              {detectedType === 'department_evaluation' && <><td className="px-4 py-3">{p.data.groupType}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${p.data.finalGrade === '상' ? 'bg-green-100 text-green-700' : p.data.finalGrade === '중' ? 'bg-yellow-100 text-yellow-700' : p.data.finalGrade === '하' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>{p.data.finalGrade || '-'}</span></td></>}
              <td className="px-4 py-3">{p.matchedEmployee ? <span className="flex items-center text-green-600"><CheckCircle size={16} className="mr-1"/>{p.matchedEmployee.name}</span> : <span className="flex items-center text-red-500"><XCircle size={16} className="mr-1"/>미매칭</span>}</td>
            </tr>))}</tbody></table></div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">매칭: <span className="font-bold text-green-600">{parsedData.filter((p) => p.matchedEmployee).length}명</span> / 미매칭: <span className="font-bold text-red-500">{parsedData.filter((p) => !p.matchedEmployee).length}명</span></div>
            <div className="flex space-x-3">
              <button onClick={() => { setParsedData([]); setFileName(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">취소</button>
              <button onClick={handleSave} disabled={uploading || !parsedData.some((p) => p.matchedEmployee)} className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 font-medium">{uploading ? '업로드 중...' : `${parsedData.filter((p) => p.matchedEmployee).length}명 업로드`}</button>
            </div>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center space-x-3 mb-2"><CheckCircle size={24} className="text-green-500" /><h2 className="text-xl font-bold text-primary">업로드 완료</h2></div>
          <p className="text-gray-600">매칭 {uploadResult.matched}명 업로드 완료{uploadResult.unmatched > 0 ? `, ${uploadResult.unmatched}명 미매칭 제외` : ''}</p>
          <Link href="/admin" className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition">관리자 패널로 돌아가기</Link>
        </div>
      )}
    </div>
  );
}
