import React, { useState } from 'react';
import { X, Target, FileText } from 'lucide-react';
import { Order, LeadSource, LeadTemperature, ProductionMethod } from '../types';
import { DEFAULT_PREP_STATUS, DEFAULT_FULFILLMENT, DEFAULT_INVOICE_STATUS, DEFAULT_CLOSEOUT, DEFAULT_LEAD_INFO, DEFAULT_ART_CONFIRMATION } from '../constants';

interface NewOrderModalProps {
  onClose: () => void;
  onCreate: (order: Partial<Order>) => void;
}

type CreateMode = 'lead' | 'quote';

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onClose, onCreate }) => {
  const [mode, setMode] = useState<CreateMode>('lead');
  const [data, setData] = useState({
    customer: '',
    customerEmail: '',
    customerPhone: '',
    projectName: '',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
    rushOrder: false,
    // Lead-specific fields
    source: 'Website' as LeadSource,
    temperature: 'Warm' as LeadTemperature,
    estimatedQuantity: 0,
    estimatedValue: 0,
    productInterest: '',
    decorationInterest: null as ProductionMethod | null,
    eventDate: '',
    contactNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = mode === 'lead' ? 'LEAD' : 'TBD';
    const orderNumber = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;

    const baseOrder: Partial<Order> = {
      id: orderNumber,
      orderNumber,
      customer: data.customer,
      customerEmail: data.customerEmail || undefined,
      customerPhone: data.customerPhone || undefined,
      projectName: data.projectName,
      dueDate: mode === 'lead' ? '' : data.dueDate,
      status: mode === 'lead' ? 'Lead' : 'Quote',
      createdAt: new Date(),
      lineItems: [],
      artStatus: 'Not Started',
      rushOrder: data.rushOrder,
      prepStatus: { ...DEFAULT_PREP_STATUS },
      fulfillment: { ...DEFAULT_FULFILLMENT },
      invoiceStatus: { ...DEFAULT_INVOICE_STATUS },
      closeoutChecklist: { ...DEFAULT_CLOSEOUT },
      artConfirmation: { ...DEFAULT_ART_CONFIRMATION },
      history: [],
      version: 1,
      isArchived: false
    };

    if (mode === 'lead') {
      baseOrder.leadInfo = {
        source: data.source,
        temperature: data.temperature,
        estimatedQuantity: data.estimatedQuantity,
        estimatedValue: data.estimatedValue,
        productInterest: data.productInterest,
        decorationInterest: data.decorationInterest,
        eventDate: data.eventDate || undefined,
        contactedAt: new Date(),
        contactNotes: data.contactNotes || undefined
      };
    }

    onCreate(baseOrder);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100">
          <h2 className="text-lg md:text-xl font-bold">{mode === 'lead' ? 'Capture New Lead' : 'Start New Quote'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"><X size={20} /></button>
        </div>

        {/* Mode Toggle */}
        <div className="px-4 md:px-6 pt-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('lead')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                mode === 'lead'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Target size={18} />
              New Lead
            </button>
            <button
              type="button"
              onClick={() => setMode('quote')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                mode === 'quote'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={18} />
              New Quote
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            {mode === 'lead'
              ? 'Capture initial interest for sales pipeline tracking'
              : 'Jump straight to building a formal quote'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Customer / Company Name *</label>
              <input
                required
                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Acme Corp"
                value={data.customer}
                onChange={e => setData({...data, customer: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Email {mode === 'quote' && '*'}
              </label>
              <input
                required={mode === 'quote'}
                type="email"
                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="contact@acme.com"
                value={data.customerEmail}
                onChange={e => setData({...data, customerEmail: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Phone {mode === 'quote' && '*'}
              </label>
              <input
                required={mode === 'quote'}
                type="tel"
                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="555-123-4567"
                value={data.customerPhone}
                onChange={e => setData({...data, customerPhone: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Project Name *</label>
            <input
              required
              className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Winter Spirit Wear"
              value={data.projectName}
              onChange={e => setData({...data, projectName: e.target.value})}
            />
          </div>

          {/* Lead-specific fields */}
          {mode === 'lead' && (
            <>
              <div className="border-t border-slate-100 pt-4 mt-4">
                <p className="text-xs font-bold text-emerald-600 uppercase mb-3">Lead Details</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lead Source</label>
                    <select
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={data.source}
                      onChange={e => setData({...data, source: e.target.value as LeadSource})}
                    >
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Cold Call">Cold Call</option>
                      <option value="Trade Show">Trade Show</option>
                      <option value="Email Campaign">Email Campaign</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Temperature</label>
                    <select
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={data.temperature}
                      onChange={e => setData({...data, temperature: e.target.value as LeadTemperature})}
                    >
                      <option value="Hot">Hot - Ready to buy</option>
                      <option value="Warm">Warm - Interested</option>
                      <option value="Cold">Cold - Just exploring</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Est. Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                      value={data.estimatedQuantity || ''}
                      onChange={e => setData({...data, estimatedQuantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Est. Value ($)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                      value={data.estimatedValue || ''}
                      onChange={e => setData({...data, estimatedValue: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Product Interest</label>
                  <input
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. T-shirts, hoodies, hats"
                    value={data.productInterest}
                    onChange={e => setData({...data, productInterest: e.target.value})}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event/Need-by Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={data.eventDate}
                    onChange={e => setData({...data, eventDate: e.target.value})}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Notes</label>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    placeholder="Notes from initial conversation..."
                    value={data.contactNotes}
                    onChange={e => setData({...data, contactNotes: e.target.value})}
                  />
                </div>
              </div>
            </>
          )}

          {/* Quote-specific fields */}
          {mode === 'quote' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Due Date *</label>
                <input
                  required
                  type="date"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={data.dueDate}
                  onChange={e => setData({...data, dueDate: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <input
                  type="checkbox"
                  id="rushOrder"
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  checked={data.rushOrder}
                  onChange={e => setData({...data, rushOrder: e.target.checked})}
                />
                <label htmlFor="rushOrder" className="text-sm font-bold text-red-700 cursor-pointer">
                  Rush Order
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-bold shadow-lg transition-colors mt-6 ${
              mode === 'lead'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700'
                : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
            }`}
          >
            {mode === 'lead' ? 'Capture Lead' : 'Create Quote'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewOrderModal;
