import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicCertificate } from '../lib/api'
import jsPDF from 'jspdf'
import { Download, Home, FileText, CheckCircle2 } from 'lucide-react'

export default function CertificateViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<{ status: 'loading' | 'loaded' | 'error'; data: any }>({ status: 'loading', data: null })

  useEffect(() => {
    if (id) {
      getPublicCertificate(id)
        .then(data => setState({ status: 'loaded', data }))
        .catch(() => setState({ status: 'error', data: null }))
    }
  }, [id])

  function downloadCertificate() {
    if (!state.data) return

    const reg = state.data
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    }) as any;

    const width = 297;
    const height = 210;

    // --- PREMIUM FRAME ---
    doc.setDrawColor(212, 175, 55); 
    doc.setLineWidth(3);
    doc.rect(8, 8, width - 16, height - 16); 
    
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, width - 24, height - 24); 

    const corners = [[8, 8], [width - 8, 8], [8, height - 8], [width - 8, height - 8]];
    corners.forEach(([x, y]) => {
      doc.setFillColor(212, 175, 55);
      doc.circle(x, y, 3, 'F');
      doc.setFillColor(30, 58, 138);
      doc.circle(x, y, 1.5, 'F');
    });

    // --- BACKGROUND WATERMARK ---
    doc.setTextColor(241, 245, 249); 
    doc.setFontSize(120);
    doc.setFont("helvetica", "bold");
    doc.text("NCA", width / 2, height / 2 + 15, { align: "center" });

    // --- HEADER ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text("NiKii Computer Academy", width / 2, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("An ISO 9001:2015 Certified Institution", width / 2, 48, { align: "center" });
    doc.text("State and Central Certified Academy • Anthiyur", width / 2, 54, { align: "center" });

    // --- MAIN TITLE ---
    doc.setTextColor(184, 134, 11); 
    doc.setFontSize(50);
    doc.setFont("times", "bolditalic");
    doc.text("Certificate of Achievement", width / 2, 85, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("This is to certify that", width / 2, 100, { align: "center" });

    // --- STUDENT NAME ---
    doc.setTextColor(37, 99, 235); 
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(reg.fullName, width / 2, 115, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed the professional program in", width / 2, 130, { align: "center" });

    // --- COURSE NAME ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(reg.courseSelected, width / 2, 145, { align: "center" });

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Awarded on ${new Date(reg.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, width / 2, 155, { align: "center" });

    // --- OFFICIAL SEAL ---
    doc.setFillColor(212, 175, 55);
    doc.circle(width - 45, 170, 15, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(width - 45, 170, 12, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("OFFICIAL SEAL", width - 45, 170, { align: "center" });
    doc.text("NCA", width - 45, 174, { align: "center" });

    // --- FOOTER ---
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const certId = `CERT-${id}-${new Date(reg.createdAt).getFullYear()}`;
    doc.text(`Certificate No: ${certId}`, 20, 195);
    doc.text(`Verification: nikiidigital.in/certificate/${id}`, 20, 200);

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(40, 185, 95, 185);
    doc.line(width - 150, 185, width - 95, 185);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DIRECTOR", 67.5, 192, { align: "center" });
    doc.text("AUTHORIZED SIGNATORY", width - 122.5, 192, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "italic");
    doc.text("Education is the Power of Life!", width / 2, 200, { align: "center" });

    doc.save(`Certificate_${reg.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500 mb-6">
          <FileText size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Certificate Not Found</h1>
        <p className="mt-4 text-lg text-slate-500 font-medium">
          Sorry, we couldn't find a confirmed certificate for this ID. Please check the URL or contact the academy.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 font-bold text-white transition hover:bg-slate-800"
        >
          <Home size={20} />
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
             <CheckCircle2 className="text-emerald-500 shrink-0" size={28} />
             Congratulations, {state.data.fullName}!
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">Your official digital certificate is ready for your records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={downloadCertificate}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition"
          >
            <Download size={18} />
            Download PDF
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            <Home size={18} />
            Home
          </button>
        </div>
      </div>

      {/* Certificate Visual Preview - horizontally scrollable on very small screens */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] border-4 md:border-8 border-slate-100 bg-white p-6 sm:p-10 md:p-20 shadow-2xl text-center landscape-certificate min-h-[400px] md:min-h-[600px] flex flex-col justify-center" style={{minWidth: '320px'}}>
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
           <div className="text-[15rem] font-bold rotate-12">NCA</div>
        </div>

        {/* Double Border Visual */}
        <div className="absolute inset-4 rounded-[2.5rem] border-4 border-amber-500/20 pointer-events-none" />
        <div className="absolute inset-6 rounded-[2.2rem] border border-blue-600/10 pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6 md:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-blue-900 tracking-tighter">NiKii Computer Academy</h2>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mt-2">An ISO 9001:2015 Certified Institution</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mt-1">State and Central Certified Academy • Anthiyur</p>
          </div>

          <div className="mb-6 md:mb-10">
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif italic font-bold text-amber-600 tracking-tight">Certificate of Achievement</h3>
            <p className="mt-8 text-xl text-slate-500 font-medium">This is to certify that</p>
          </div>

          <div className="mb-6 md:mb-10">
            <h4 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight">
              {state.data.fullName}
            </h4>
            <p className="mt-8 text-xl text-slate-500 font-medium">has successfully completed the professional program in</p>
          </div>

          <div className="mb-12">
            <h5 className="text-4xl font-black text-blue-800">{state.data.courseSelected}</h5>
            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
              Awarded on {new Date(state.data.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mt-16 pt-10 px-10 border-t border-slate-100">
            <div className="text-left w-64">
              <div className="h-0.5 w-full bg-blue-900/10 mb-2"></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Director</p>
            </div>
            
            <div className="text-center pb-2 flex-1">
              {/* Virtual Seal */}
              <div className="mx-auto h-24 w-24 rounded-full border-4 border-amber-500/10 bg-amber-500/5 flex items-center justify-center mb-4">
                 <div className="text-[10px] font-black text-amber-600 uppercase text-center leading-tight">Official<br/>NCA Seal</div>
              </div>
              <p className="text-blue-600 font-black tracking-widest text-[10px] uppercase">Education is the Power of Life!</p>
            </div>

            <div className="text-right w-64">
              <div className="h-0.5 w-full bg-blue-900/10 mb-2"></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-6 text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest flex flex-col sm:flex-row justify-between items-center gap-1 px-4 sm:px-10">
             <span>Cert No: CERT-{id}-{new Date(state.data.createdAt).getFullYear()}</span>
             <span className="text-center">Verification: nikiidigital.in/certificate/{id}</span>
          </div>
        </div>
      </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .landscape-certificate {
          aspect-ratio: 1.414 / 1;
        }
      `}} />
    </div>
  )
}
