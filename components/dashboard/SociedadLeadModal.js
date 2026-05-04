'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * SociedadLeadModal
 * Aparece al hacer clic en una fila de Sociedades Detalle.
 * Muestra datos de la sociedad y permite generar y copiar las filas de Lead y Tarea.
 */
export default function SociedadLeadModal({ sociedad, onClose }) {
  // ── Datos del AC ──────────────────────────────────────────────────────────
  const [acsOptions, setAcsOptions] = useState([]);
  const [acEmail, setAcEmail] = useState('');
  const [acCodigo, setAcCodigo] = useState('');
  const [acSearchQuery, setAcSearchQuery] = useState('');
  const [acDropOpen, setAcDropOpen] = useState(false);
  const acDropRef = useRef(null);

  // ── Datos del Lead ────────────────────────────────────────────────────────
  const [leadId, setLeadId] = useState('');
  const [fecha, setFecha] = useState('');
  const [fuente, setFuente] = useState('');
  const [comentario, setComentario] = useState('');
  const [creadoPor, setCreadoPor] = useState('');
  const [creadoPorTarea, setCreadoPorTarea] = useState('');
  const [tipoTarea, setTipoTarea] = useState('');

  // ── Datos de contacto (se completan via lookup Metabase) ───────────────
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [idCliente, setIdCliente] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // ── UI States ──────────────────────────────────────────────────────
  const [copiedLead, setCopiedLead] = useState(false);
  const [copiedTarea, setCopiedTarea] = useState(false);
  const [loadingId, setLoadingId] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [guardandoCRM, setGuardandoCRM] = useState(false);
  const [guardadoCRM, setGuardadoCRM] = useState(false);
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [guardadoTarea, setGuardadoTarea] = useState(false);

  // ID Tarea — código alfanumérico random de 8 chars, fijo por instancia del modal
  const [tareaId] = useState(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });

  // ── Campos pre-completados desde la sociedad ───────────────────────────────
  const cuit = sociedad?._cuit || '';
  const razonSocial = sociedad?.razon_social_senasa || sociedad?.razon_social || '';
  const partido = sociedad?.partido_establecimiento_senasa || '';
  const provincia = sociedad?.prov_establecimiento_senasa || sociedad?.prov_fiscal_senasa || '';
  const dc = sociedad?._dcRow;
  const acAsignado = dc?.asociado_comercial || dc?.representante || '';

  // ── CRM lookup ────────────────────────────────────────────────────────────
  const [crmAc, setCrmAc] = useState(null);
  const [crmLeadId, setCrmLeadId] = useState(null);
  const [crmLoading, setCrmLoading] = useState(false);

  useEffect(() => {
    if (!cuit) return;
    setCrmLoading(true);
    fetch(`/api/sociedades/crm-check?cuit=${cuit}`)
      .then(r => r.json())
      .then(d => {
        setCrmAc(d.acEmail || null);
        setCrmLeadId(d.leadId || null);
      })
      .catch(() => {})
      .finally(() => setCrmLoading(false));
  }, [cuit]);

  // ── Lookup de contacto en Metabase (mismo que crear-lead) ───────────
  useEffect(() => {
    if (!cuit || cuit.length !== 11) return;
    setLookupLoading(true);
    fetch('/api/asignaciones/leads/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // acEmail requerido por la API; usamos placeholder ya que solo queremos datos de Metabase
      body: JSON.stringify({ searchType: 'cuit', query: cuit, acEmail: 'sistema@dcac.ar' }),
    })
      .then(r => r.json())
      .then(d => {
        const row = Array.isArray(d.data) ? d.data[0] : d.data;
        if (!row) return;
        // Función helper que prueba múltiples nombres de campo
        const get = (...keys) => {
          for (const k of keys) {
            if (row[k] && String(row[k]).trim() && String(row[k]).trim() !== '-') return String(row[k]).trim();
          }
          return '';
        };
        setNombre(get('nombre', 'Nombre', 'nombre_usuario'));
        setApellido(get('apellido', 'Apellido', 'apellido_usuario'));
        setTelefono(get('telefono', 'teléfono', 'Teléfono', 'telefono_usuario', 'Teléfono Usuario'));
        setEmailUsuario(get('email', 'Email', 'email_usuario', 'correo'));
        setIdCliente(get('id_usuario', 'ID Cliente', 'id cliente', 'ID_Usuario', 'id_usuario'));

      })
      .catch(() => {})
      .finally(() => setLookupLoading(false));
  }, [cuit]);

  // Fecha hoy formateada mm/dd/yyyy (formato Google Sheets)
  const todayFormatted = (() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  })();

  // ── Cargar ACs al montar ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/asignaciones/acs')
      .then(r => r.json())
      .then(d => setAcsOptions(d.acs || []))
      .catch(() => {});
  }, []);

  // ── Cerrar dropdown al clickear afuera ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (acDropRef.current && !acDropRef.current.contains(e.target)) setAcDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cerrar con Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Obtener próximo Lead ID ────────────────────────────────────────────────
  const fetchLeadId = async (email, codigo) => {
    if (!email) return null;
    try {
      setLoadingId(true);
      const prefix = codigo || email.substring(0, 2).toUpperCase();
      const res = await fetch(`/api/asignaciones/leads/last-id?prefix=${prefix}&sheet=leads`);
      if (!res.ok) return null;
      const { maxNumber } = await res.json();
      const id = `${prefix}${maxNumber + 1}`;
      setLeadId(id);
      setFecha(todayFormatted);
      return id;
    } catch { return null; }
    finally { setLoadingId(false); }
  };

  // ── Cuando el AC es seleccionado, obtener ID ──────────────────────────────
  const handleSelectAc = async (ac) => {
    setAcEmail(ac.email);
    setAcCodigo(ac.codigo || '');
    setAcSearchQuery(`${ac.nombre} - ${ac.email}`);
    setAcDropOpen(false);
    await fetchLeadId(ac.email, ac.codigo || '');
  };

  // ── Texto de tarea ─────────────────────────────────────────────────────────
  const tareaTexto = `¡Tenés una Nueva Sociedad asignada! Llamalo y dejá un comentario`;

  // ── Guardar en CRM (Google Sheets) ──────────────────────────────────────────
  const handleGuardarCRM = async () => {
    if (!acEmail) { setErrorMsg('Seleccioná un AC primero'); return; }
    setErrorMsg('');
    setGuardandoCRM(true);
    try {
      const prefix = acCodigo || acEmail.substring(0, 2).toUpperCase();
      const resId = await fetch(`/api/asignaciones/leads/last-id?prefix=${prefix}&sheet=leads`);
      if (!resId.ok) throw new Error('No se pudo obtener el próximo Lead ID');
      const { maxNumber } = await resId.json();
      const finalId = `${prefix}${maxNumber + 1}`;
      const finalFecha = todayFormatted;
      setLeadId(finalId);
      setFecha(finalFecha);

      const res = await fetch('/api/sociedades/guardar-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: finalId, fecha: finalFecha, acEmail, fuente,
          nombre, apellido, idCliente,
          provincia, partido, telefono, email: emailUsuario, cuit, razonSocial,
          comentario, creadoPor,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar');

      setGuardadoCRM(true);
      setTimeout(() => setGuardadoCRM(false), 4000);
    } catch (e) {
      setErrorMsg('Error al guardar en CRM: ' + e.message);
    } finally {
      setGuardandoCRM(false);
    }
  };

  // ── Copiar Fila Lead (TSV fallback) ─────────────────────────────────────────
  const handleCopyLead = async () => {
    if (!acEmail) { setErrorMsg('Seleccioná un AC primero'); return; }
    setErrorMsg('');
    try {
      const prefix = acCodigo || acEmail.substring(0, 2).toUpperCase();
      const res = await fetch(`/api/asignaciones/leads/last-id?prefix=${prefix}&sheet=leads`);
      if (!res.ok) throw new Error('No se pudo obtener ID');
      const { maxNumber } = await res.json();
      const finalId = `${prefix}${maxNumber + 1}`;
      const finalFecha = todayFormatted;
      setLeadId(finalId);
      setFecha(finalFecha);

      const cols = [
        finalId, finalFecha, acEmail, fuente,
        nombre, apellido, idCliente, provincia, partido, telefono, emailUsuario, cuit, razonSocial,
        '', '', '', '', '', '', '', '', '', // N-V
        comentario,
        '', '', '', '', '', '', '', // X-AD
        creadoPor,
      ];
      await navigator.clipboard.writeText(cols.join('\t'));
      setCopiedLead(true);
      setTimeout(() => setCopiedLead(false), 3000);
    } catch (e) {
      setErrorMsg('Error al copiar: ' + e.message);
    }
  };


  // ── Copiar Fila Tarea ──────────────────────────────────────────────────────
  const handleCopyTarea = async () => {
    if (!acEmail) { setErrorMsg('Seleccioná un AC primero'); return; }
    setErrorMsg('');
    try {
      let finalTareaId = leadId;
      if (!finalTareaId) {
        const prefix = acCodigo || acEmail.substring(0, 2).toUpperCase();
        const res = await fetch(`/api/asignaciones/leads/last-id?prefix=${prefix}&sheet=leads`);
        if (!res.ok) throw new Error('No se pudo obtener ID');
        const { maxNumber } = await res.json();
        finalTareaId = `${prefix}${maxNumber + 1}`;
        setLeadId(finalTareaId);
        setFecha(todayFormatted);
      }
      // A:IDTarea B:IDLead C:Titulo D:AC E:Tarea F:Fecha G:Estado H:(vacío) I:CreadoPor J-K:(vacíos) L:Tipo
      const cols = [
        finalTareaId, finalTareaId, razonSocial, acEmail,
        tareaTexto, todayFormatted, 'Pendiente',
        '', creadoPorTarea, '', '', tipoTarea,
      ];
      await navigator.clipboard.writeText(cols.join('\t'));
      setCopiedTarea(true);
      setTimeout(() => setCopiedTarea(false), 3000);
    } catch (e) {
      setErrorMsg('Error al copiar: ' + e.message);
    }
  };

  // ── Guardar Tarea en CRM ────────────────────────────────────────────
  const handleGuardarTarea = async () => {
    if (!acEmail) { setErrorMsg('Seleccioná un AC primero'); return; }
    setErrorMsg('');
    setGuardandoTarea(true);
    try {
      // Si la sociedad ya tiene un lead en el CRM, usar ese ID para la tarea
      const existingLeadId = crmLeadId; // viene del crm-check al abrir el modal

      // Para ID Tarea: si existe crmLeadId usamos el tareaId random, sino el leadId generado
      let finalTareaId = crmLeadId ? tareaId : leadId;
      if (!finalTareaId) {
        const prefix = acCodigo || acEmail.substring(0, 2).toUpperCase();
        const resId = await fetch(`/api/asignaciones/leads/last-id?prefix=${prefix}&sheet=leads`);
        if (!resId.ok) throw new Error('No se pudo obtener el Lead ID');
        const { maxNumber } = await resId.json();
        finalTareaId = `${prefix}${maxNumber + 1}`;
        setLeadId(finalTareaId);
        setFecha(todayFormatted);
      }

      // ID Lead: si la sociedad ya estaba en el CRM, usar ese; sino usar el nuevo
      const finalLeadId = existingLeadId || finalTareaId;

      const res = await fetch('/api/sociedades/guardar-tarea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTarea: finalTareaId,
          idLead: finalLeadId,
          tituloLead: razonSocial,
          acAsignado: acEmail,
          tarea: tareaTexto,
          fecha: todayFormatted,
          estado: 'Pendiente',
          creadoPor: creadoPorTarea,
          tipo: tipoTarea,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar tarea');

      setGuardadoTarea(true);
      setTimeout(() => setGuardadoTarea(false), 4000);
    } catch (e) {
      setErrorMsg('Error al guardar Tarea en CRM: ' + e.message);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const acsFiltered = acsOptions.filter(ac =>
    ac.nombre.toLowerCase().includes(acSearchQuery.toLowerCase()) ||
    ac.email.toLowerCase().includes(acSearchQuery.toLowerCase())
  );

  const CREADO_POR_OPTIONS = [
    'jtonon@decampoacampo.com',
    'ptaffarel@decampoacampo.com',
    'jsineriz@decampoacampo.com',
    'sdewey@decampoacampo.com',
    'arivas@decampoacampo.com',
  ];

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 7,
    border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
    background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: 10, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3, display: 'block',
  };
  const needsStyle = {
    ...inputStyle, borderColor: '#f59e0b', background: '#fffbeb',
  };
  const fieldGroup = (label, value, setter, opts = {}) => {
    const empty = !value || value.trim() === '';
    const isNeeded = opts.required && empty;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <label style={{ ...labelStyle, color: isNeeded ? '#d97706' : '#64748b' }}>{label}</label>
        {opts.type === 'select' ? (
          <select value={value} onChange={e => setter(e.target.value)} style={inputStyle}>
            <option value=''>Seleccionar...</option>
            {CREADO_POR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            value={value}
            onChange={e => setter(e.target.value)}
            placeholder={opts.placeholder || 'Completar...'}
            style={isNeeded ? needsStyle : inputStyle}
            readOnly={opts.readOnly}
          />
        )}
      </div>
    );
  };

  const sectionHeader = (title, subtitle, onCopy, copied, loading) => (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>
      </div>
      <button
        onClick={onCopy}
        style={{
          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          border: `1.5px solid ${copied ? '#16a34a' : '#e2e8f0'}`,
          background: copied ? '#f0fdf4' : '#fff',
          color: copied ? '#16a34a' : '#475569',
          display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
        }}
      >
        {loading ? '⏳' : copied ? '✓' : '📋'} {copied ? '¡Copiado!' : 'Copiar fila (TSV)'}
      </button>
    </div>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 780,
        margin: '0 auto',
        background: '#fff', borderRadius: 14,
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
              {razonSocial || 'Sociedad'}
            </div>
            <div style={{ color: '#bfdbfe', fontSize: 12, display: 'flex', gap: 12 }}>
              <span>CUIT: <strong style={{ color: '#fff' }}>{cuit || '-'}</strong></span>
              {partido && <span>📍 {partido}{provincia ? `, ${provincia}` : ''}</span>}
              {sociedad?.total_bovinos > 0 && <span>🐄 {sociedad.total_bovinos} cab.</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#93c5fd', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        {/* ── Body (no scroll constraint, overlay scrolls) ── */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Selector AC ── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Asociado Comercial a asignar
            </div>
            <div ref={acDropRef} style={{ position: 'relative' }}>
              <input
                value={acSearchQuery}
                onChange={e => { setAcSearchQuery(e.target.value); setAcEmail(''); setAcDropOpen(true); }}
                onFocus={() => setAcDropOpen(true)}
                placeholder='Escribe para buscar comercial...'
                style={{
                  ...inputStyle,
                  border: `1.5px solid ${acEmail ? '#16a34a' : '#93c5fd'}`,
                  background: acEmail ? '#f0fdf4' : '#fff',
                }}
              />
              {acEmail && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#16a34a', fontSize: 14 }}>✓</span>}
              {acDropOpen && (
                <ul style={{ position: 'absolute', zIndex: 50, top: '100%', marginTop: 4, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
                  {acsFiltered.length === 0 && (
                    <li style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                      {acsOptions.length === 0 ? '⏳ Cargando...' : 'Sin resultados'}
                    </li>
                  )}
                  {acsFiltered.map((ac, i) => (
                    <li key={i}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelectAc(ac)}
                      style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{ac.nombre}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{ac.email}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {acAsignado && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Comercial actual en admin: <strong style={{ color: '#1d4ed8' }}>{acAsignado}</strong>
              </div>
            )}
            <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>
              {crmLoading ? (
                <span style={{ color: '#94a3b8' }}>CRM: buscando...</span>
              ) : crmAc ? (
                <span>
                  CRM:{' '}
                  <strong style={{ color: '#7c3aed' }}>{crmAc}</strong>
                  {crmLeadId && (
                    <span style={{ marginLeft: 6, color: '#94a3b8', fontStyle: 'italic' }}>#{crmLeadId}</span>
                  )}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>CRM: sin registro</span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ── Fila Lead ── */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Fila de Lead</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Revisa los campos y guardá directo en el CRM.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Botón secundario TSV */}
                <button
                  onClick={handleCopyLead}
                  title="Copiar como TSV para pegar manualmente"
                  style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${copiedLead ? '#16a34a' : '#e2e8f0'}`,
                    background: copiedLead ? '#f0fdf4' : '#fff',
                    color: copiedLead ? '#16a34a' : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {copiedLead ? '✓ TSV copiado' : '📋 TSV'}
                </button>
                {/* Botón principal Guardar en CRM */}
                <button
                  onClick={handleGuardarCRM}
                  disabled={guardandoCRM || guardadoCRM}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: guardandoCRM ? 'wait' : 'pointer',
                    border: `1.5px solid ${guardadoCRM ? '#16a34a' : '#1d4ed8'}`,
                    background: guardadoCRM ? '#f0fdf4' : '#1d4ed8',
                    color: guardadoCRM ? '#16a34a' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
                    opacity: guardandoCRM ? 0.7 : 1,
                  }}
                >
                  {guardandoCRM ? '⏳ Asignando...' : guardadoCRM ? '✅ Asignado en CRM' : '💾 Asignar en CRM'}
                </button>
              </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px 16px' }}>
              {fieldGroup('1. Lead ID', loadingId ? 'Calculando...' : (leadId || 'Seleccioná un AC'), () => {}, { readOnly: true })}
              {fieldGroup('2. Fecha Asignación', fecha || todayFormatted, () => {}, { readOnly: true })}
              {fieldGroup('3. AC Asignado', acEmail, () => {}, { readOnly: true, required: true })}
              {fieldGroup('4. Fuente', fuente, setFuente, { placeholder: 'Completar...' })}
              {fieldGroup('5. Nombre', lookupLoading ? 'Buscando...' : nombre, setNombre, { placeholder: '-' })}
              {fieldGroup('6. Apellido', lookupLoading ? '...' : apellido, setApellido, { placeholder: '-' })}
              {fieldGroup('7. ID Cliente', lookupLoading ? '...' : idCliente, setIdCliente, { placeholder: '-' })}
              {fieldGroup('8. Provincia', provincia, () => {}, { readOnly: true })}
              {fieldGroup('9. Partido', partido, () => {}, { readOnly: true })}
              {fieldGroup('10. Teléfono', lookupLoading ? '...' : telefono, setTelefono, { placeholder: '-' })}
              {fieldGroup('11. Email', lookupLoading ? '...' : emailUsuario, setEmailUsuario, { placeholder: '-' })}
              {fieldGroup('12. CUIT', cuit, () => {}, { readOnly: true })}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <label style={labelStyle}>13. Razón Social</label>
                <input value={razonSocial} readOnly style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Comentario (col. W)</label>
                <input value={comentario} onChange={e => setComentario(e.target.value)} placeholder='Completar...' style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Creado Por (col. AE)</label>
                <select value={creadoPor} onChange={e => setCreadoPor(e.target.value)} style={inputStyle}>
                  <option value=''>Seleccionar...</option>
                  {CREADO_POR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Fila Tarea ── */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header con botones */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Fila de Tarea</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Guardá la tarea directo en el CRM.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Botón TSV fallback */}
                <button
                  onClick={handleCopyTarea}
                  title="Copiar como TSV para pegar manualmente"
                  style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${copiedTarea ? '#16a34a' : '#e2e8f0'}`,
                    background: copiedTarea ? '#f0fdf4' : '#fff',
                    color: copiedTarea ? '#16a34a' : '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {copiedTarea ? '✓ TSV copiado' : '📋 TSV'}
                </button>
                {/* Botón principal Guardar Tarea */}
                <button
                  onClick={handleGuardarTarea}
                  disabled={guardandoTarea || guardadoTarea}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: guardandoTarea ? 'wait' : 'pointer',
                    border: `1.5px solid ${guardadoTarea ? '#16a34a' : '#7c3aed'}`,
                    background: guardadoTarea ? '#f0fdf4' : '#7c3aed',
                    color: guardadoTarea ? '#16a34a' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
                    opacity: guardandoTarea ? 0.7 : 1,
                  }}
                >
                  {guardandoTarea ? '⏳ Creando...' : guardadoTarea ? '✅ Tarea creada' : '📌 Crear tarea en CRM'}
                </button>
              </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px 16px' }}>
              {fieldGroup('1. ID Tarea', crmLeadId ? tareaId : (loadingId ? 'Calculando...' : (leadId || '-')), () => {}, { readOnly: true })}
              {fieldGroup('2. ID Lead', crmLeadId || (loadingId ? '...' : (leadId || '-')), () => {}, { readOnly: true, style: crmLeadId ? { ...inputStyle, background: '#eff6ff', borderColor: '#93c5fd', fontWeight: 700, color: '#1d4ed8' } : {} })}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>3. Título Lead</label>
                <input value={razonSocial} readOnly style={inputStyle} />
              </div>
              {fieldGroup('4. AC Asignado', acEmail || '-', () => {}, { readOnly: true })}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>5. Tarea</label>
                <input value={tareaTexto} readOnly style={inputStyle} />
              </div>
              {fieldGroup('6. Fecha Tarea', todayFormatted, () => {}, { readOnly: true })}
              {fieldGroup('7. Estado', 'Pendiente', () => {}, { readOnly: true })}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Creado Por (col. I)</label>
                <select value={creadoPorTarea} onChange={e => setCreadoPorTarea(e.target.value)} style={inputStyle}>
                  <option value=''>Seleccionar...</option>
                  {CREADO_POR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Tipo (col. L)</label>
                <input value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} placeholder='Escribe o selecciona...' style={inputStyle} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
