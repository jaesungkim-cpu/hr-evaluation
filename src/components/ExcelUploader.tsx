'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelUploaderProps {
  onUpload: (data: Record<string, any>[]) => Promise<void>;
  isLoading?: boolean;
}

export default function ExcelUploader({ onUpload, isLoading }: ExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, any>[] | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    setSuccess('');

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Excel 파일(.xlsx, .xls)만 업로드 가능합니다');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setError('Excel 파일에 데이터가 없습니다');
            return;
          }

          setSelectedFile(file);
          setPreview(jsonData.slice(0, 5));
        } catch (err) {
          setError('Excel 파일을 읽을 수 없습니다');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('파일 처리 중 오류가 발생했습니다');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !preview) {
      setError('파일을 선택해주세요');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          await onUpload(jsonData);
          setSuccess(`${jsonData.length}명의 자체평가 데이터가 업로드되었습니다`);
          setSelectedFile(null);
          setPreview(null);
        } catch (err) {
          setError('데이터 처리 중 오류가 발생했습니다');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setError('업로드 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          dragActive
            ? 'border-secondary bg-secondary bg-opacity-5'
            : 'border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />

        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Excel 파일 업로드
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          드래그하여 놓거나 클릭하여 선택
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-block px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-opacity-90 transition"
        >
          파일 선택
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger bg-opacity-10 text-danger px-4 py-3 rounded-lg flex items-start space-x-2">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-success bg-opacity-10 text-success px-4 py-3 rounded-lg flex items-start space-x-2">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Selected File Info */}
      {selectedFile && (
        <div className="bg-light rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="text-secondary" size={24} />
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-600">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">
                미리보기 (처음 5행)
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      {Object.keys(preview[0]).slice(0, 5).map((key) => (
                        <th
                          key={key}
                          className="text-left px-2 py-1 font-medium text-gray-700"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        {Object.keys(row)
                          .slice(0, 5)
                          .map((key) => (
                            <td key={key} className="px-2 py-1 text-gray-600">
                              {String(row[key]).substring(0, 20)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-light transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
