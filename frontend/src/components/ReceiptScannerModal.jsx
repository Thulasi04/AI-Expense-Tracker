import React, { useState } from 'react';
import { scanReceipt } from '../services/ocr';
import { expenseService } from '../services/api';
import { formatINR } from '../utils/formatters';
import {
  X,
  Upload,
  Scan,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function ReceiptScannerModal({ isOpen, onClose, onExpenseCreated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setParsedData(null);
      setError('');
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    setProgressStatus('Initializing OCR engine...');
    setProgressPercent(10);
    setError('');

    try {
      const result = await scanReceipt(selectedFile, (m) => {
        if (m.status === 'recognizing text') {
          setProgressStatus('Recognizing receipt text...');
          setProgressPercent(Math.round(m.progress * 100));
        }
      });

      if (!result.amount || result.amount <= 0) {
        setError('Could not detect a clear total amount on this receipt. You can manually adjust the fields below.');
      }

      setParsedData(result);
    } catch (err) {
      console.error('OCR Error:', err);
      setError('OCR recognition failed. Please upload a clearer receipt image or enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScannedExpense = async () => {
    if (!parsedData) return;
    setSaving(true);
    setError('');

    try {
      await expenseService.createExpense({
        amount: parsedData.amount || 0,
        description: parsedData.description || 'Scanned Receipt',
        category: parsedData.category || 'Shopping',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        merchant: parsedData.merchant || null,
        payment_method: 'UPI',
      });
      onExpenseCreated();
      onClose();
    } catch (err) {
      console.error('Error saving scanned expense:', err);
      setError('Failed to record expense. Please verify the amount and details.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setParsedData(null);
    setError('');
    setProgressPercent(0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(229, 9, 20, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Scan size={18} color="var(--netflix-red)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>Receipt OCR Scanner</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Powered by Tesseract.js client-side OCR
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FF6B6B',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          {!previewUrl ? (
            <label style={{
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onDragOver={(e) => e.preventDefault()}
            >
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(229, 9, 20, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--netflix-red)'
              }}>
                <Upload size={26} />
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>
                  Click to upload or drag &amp; drop receipt
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Supports JPG, PNG, WEBP invoices &amp; bills
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '140px',
                height: '160px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
                flexShrink: 0,
                backgroundColor: '#000'
              }}>
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.88rem', color: '#fff', fontWeight: '600' }}>
                  {selectedFile?.name}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Size: {(selectedFile?.size / 1024).toFixed(1)} KB
                </p>

                {!parsedData && !scanning && (
                  <button
                    onClick={handleScan}
                    className="btn-netflix"
                    style={{ marginTop: '0.5rem', alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <Scan size={16} />
                    <span>Run OCR Recognition</span>
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Choose Different Image
                </button>
              </div>
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={15} className="animate-spin" />
                  {progressStatus}
                </span>
                <span style={{ color: 'var(--netflix-red)', fontWeight: '700' }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: 'var(--netflix-red)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {/* Parsed Results Editor */}
          {parsedData && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: '700', marginBottom: '0.85rem' }}>
                <CheckCircle2 size={18} />
                <span>Extracted Receipt Details</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Detected Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={parsedData.amount}
                    onChange={(e) => setParsedData({ ...parsedData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Detected Merchant</label>
                  <input
                    type="text"
                    className="form-input"
                    value={parsedData.merchant}
                    onChange={(e) => setParsedData({ ...parsedData, merchant: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Receipt Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={parsedData.date}
                    onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={parsedData.category}
                    onChange={(e) => setParsedData({ ...parsedData, category: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScannedExpense}
                  className="btn-netflix"
                  disabled={saving || !parsedData.amount || parsedData.amount <= 0}
                >
                  {saving ? 'Recording...' : `Confirm & Log ${formatINR(parsedData.amount)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
