'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee, EvaluationPeriod } from '@/lib/types';
import ExcelUploader from '@/components/ExcelUploader';
import { ChevronLeft } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUploadData();
  }, []);

  const loadUploadData = async () => {
    try {
      const sessionId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_id='))
        ?.split('=')[1];

      if (!sessionId) {
        router.push('/');
        return;
      }

      // Get current user
      const { data: userData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!userData || userData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setUser(userData);

      // Get evaluation periods
      const { data: periodData } = await supabase
        .from('evaluation_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (periodData) {
        setPeriods(periodData);
        if (periodData.length > 0) {
          setSelectedPeriod(periodData[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load upload data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (data: Record<string, any>[]) => {
    if (!selectedPeriod) {
      alert('평가 기간을 선택해주세요');
      return;
    }

    setUploading(true);

    try {
      // Get all employees for matching
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, email, employee_number');

      const insertData = data.map((row) => {
        // Try to match employee by name, email, or employee number
        const employee = employees?.find(
          (e) =>
            e.name === row.name ||
            e.email === row.email ||
            e.employee_number === row.employee_number
        );

        return {
          employee_id: employee?.id,
          period_id: selectedPeriod,
          content_json: row,
          uploaded_at: new Date().toISOString(),
        };
      });

      // Filter out unmatchedrows
      const matchedData = insertData.filter((item) => item.employee_id);

      if (matchedData.length === 0) {
        alert('매칭된 구성원이 없습니다. 이름 또는 이메일을 확인해주세요');
        return;
      }

      const { error } = await supabase
        .from('self_assessments')
        .insert(matchedData);

      if (error) throw error;

      alert(
        `${matchedData.length}명의 자체평가가 업로드되었습니다 (${data.length - matchedData.length}명 미매칭)`
      );
      router.push('/admin');
    } catch (error) {
      console.error('Failed to upload:', error);
      alert('업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">관리자 권한이 필요합니다</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center space-x-2 text-secondary hover:text-primary transition mb-6"
      >
        <ChevronLeft size={20} />
        <span>돌아가기</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          자체평가 데이터 업로드
        </h1>
        <p className="text-gray-600">
          Excel 파일에서 구성원의 자체평가 데이터를 일괄 업로드합니다
        </p>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
          평가 기간
        </label>
        <select
          id="period"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">평가 기간 선택</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
        {periods.length === 0 && (
          <p className="text-sm text-warning mt-2">
            평가 기간을 먼저 생성해야 합니다
          </p>
        )}
      </div>

      {/* Uploader */}
      <div className="bg-white rounded-lg shadow p-6">
        <ExcelUploader
          onUpload={handleUpload}
          isLoading={uploading}
        />
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-light rounded-lg p-6 border-l-4 border-secondary">
        <h3 className="font-bold text-primary mb-3">업로드 파일 형식</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• Excel 파일 형식 (.xlsx, .xls)</li>
          <li>
            • 첫 번째 행에 헤더 포함 (name, email, employee_number 필수)
          </li>
          <li>• 구성원 이름, 이메일, 또는 사원번호로 자동 매칭됩니다</li>
          <li>• 매칭되지 않는 행은 업로드되지 않습니다</li>
          <li>• 각 구성원은 평가 기간당 1개의 자체평가만 가능합니다</li>
        </ul>
      </div>
    </div>
  );
}
