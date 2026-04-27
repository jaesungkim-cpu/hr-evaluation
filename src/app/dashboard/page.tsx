'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee, Evaluation, EvaluationPeriod } from '@/lib/types';
import EvaluateeList from '@/components/EvaluateeList';
import { supabase } from '@/lib/supabase';
import { BarChart3, Users, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [evaluatees, setEvaluatees] = useState<Employee[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<EvaluationPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0 });

  useEffect(() => { loadDashboardData(); }, []);
  const loadDashboardData = async () => {
    try {
      const sessionId = document.cookie.split('; ').find((row) => row.startsWith('session_id='))?.split('=')[1];
      if (!sessionId) { router.push('/'); return; }
      const { data: userData } = await supabase.from('employees').select('*').eq('id', sessionId).single();
      if (!userData) { router.push('/'); return; }
      setUser(userData);
      const { data: periodData } = await supabase.from('evaluation_periods').select('*').order('created_at', { ascending: false }).limit(1).single();
      setCurrentPeriod(periodData);
      let q = supabase.from('employees').select('*').eq('is_evaluated', true);
      if (userData.role === 'first_evaluator') q = q.eq('first_evaluator_id', userData.id);
      else if (userData.role === 'second_evaluator') q = q.eq('second_evaluator_id', userData.id);
      else if (userData.role !== 'ceo' && userData.role !== 'admin') { setLoading(false); return; }
      const { data: evData } = await q;
      if (evData) { setEvaluatees(evData); setStats({ total: evData.length, submitted: 0, pending: evData.length }); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">로딩 중...</p></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">사용자 정보를 불러올 수 없습니다</p></div>;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8"><h1 className="text-3xl font-bold text-primary mb-2">안녕하세요, {user.name}님</h1><p className="text-gray-600">{currentPeriod?.name || '현재 평가 기간'}</p></div>

      {(user.role==='first_evaluator'||user.role==='second_evaluator'||user.role==='ceo'||user.role==='admin')&&(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">총 평가 대상</p><p className="text-3xl font-bold text-primary">{stats.total}</p></div><Users className="text-secondary opacity-50" size={40}/></div></div>
          <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">완료</p><p className="text-3xl font-bold text-success">{stats.submitted}</p></div><BarChart3 className="text-success opacity-50" size={40}/></div></div>
          <div className="bg-white rounded-lg shadow p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">대기 중</p><p className="text-3xl font-bold text-warning">{stats.pending}</p></div><Clock className="text-warning opacity-50" size={40}/></div></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <a href="/evaluate/direct" className="block p-6 bg-secondary bg-opacity-10 rounded-lg border-2 border-secondary hover:bg-opacity-20 transition"><h3 className="font-bold text-primary mb-2">평가 등록</h3><p className="text-sm text-gray-600">구성원 평가를 직접 등록합니다 (1차/2차 평가)</p></a>
        <a href="/admin/review" className="block p-6 bg-green-50 rounded-lg border-2 border-green-300 hover:bg-green-100 transition"><h3 className="font-bold text-primary mb-2">평가 데이터 조회</h3><p className="text-sm text-gray-600">업로드된 평가 내용을 조회합니다</p></a>
      </div>

      {(user.role==='first_evaluator'||user.role==='second_evaluator'||user.role==='ceo')&&(
        <div className="bg-white rounded-lg shadow p-6 mb-8"><h2 className="text-xl font-bold text-primary mb-6">{user.role==='first_evaluator'?'평가할 구성원 (1차 평가)':user.role==='second_evaluator'?'평가할 구성원 (2차 평가)':'모든 평가 대상'}</h2>{currentPeriod?<EvaluateeList employees={evaluatees} periodId={currentPeriod.id}/>:<p className="text-gray-600">평가 기간이 없습니다</p>}</div>
      )}

      {user.role==='admin'&&(
        <div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold text-primary mb-6">관리자 기능</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><a href="/admin/upload" className="block p-6 bg-light rounded-lg border-2 border-gray-200 hover:border-secondary transition"><h3 className="font-bold text-primary mb-2">평가 파일 업로드</h3><p className="text-sm text-gray-600">Excel 파일에서 평가 데이터를 업로드합니다</p></a><a href="/admin" className="block p-6 bg-light rounded-lg border-2 border-gray-200 hover:border-secondary transition"><h3 className="font-bold text-primary mb-2">관리자 패널</h3><p className="text-sm text-gray-600">구성원, 조직도, 평가 데이터 관리</p></a></div></div>
      )}
    </div>
  );
}
