"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Copy, Check, Info, FilePlus, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Definimos la estructura base de los datos de un Lead
type LeadData = {
  nombre: string;
  apellido: string;
  id_usuario: string;
  provincia: string;
  partido: string;
  telefono: string;
  email: string;
  cuit: string; // normalizado sin guiones para interno, pero la UI lo muestra
  razon_social: string;
  acEmail: string;
  fuente: string;
  lead_id?: string;
  tarea_id?: string;
  fecha?: string;
  ofrecio?: string;
  oferto?: string;
  comentario?: string;
  creado_por?: string;
  creado_por_tarea?: string;
  tipo_tarea?: string;
  source?: string;
  [key: string]: any;
};

function CrearLeadPageContent() {
  const [acEmail, setAcEmail] = useState("");
  const [acCodigo, setAcCodigo] = useState("");
  const [acSearchQuery, setAcSearchQuery] = useState("");
  const [acsOptions, setAcsOptions] = useState<{email: string, nombre: string, codigo: string}[]>([]);
  const [isAcDropdownOpen, setIsAcDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [fuentesOptions, setFuentesOptions] = useState<string[]>([]);
  const [isFuenteDropdownOpen, setIsFuenteDropdownOpen] = useState(false);
  const fuenteDropdownRef = useRef<HTMLDivElement>(null);

  const [tiposOptions, setTiposOptions] = useState<string[]>([]);
  const [isTipoDropdownOpen, setIsTipoDropdownOpen] = useState(false);
  const tipoDropdownRef = useRef<HTMLDivElement>(null);

  const [searchMode, setSearchMode] = useState<"cuit" | "razon_social" | "nombre_apellido">("cuit");
  const [query, setQuery] = useState("");

  // Guarda el email del AC que llegÃ³ por URL (se aplica cuando acsOptions cargue)
  const [pendingAcEmail, setPendingAcEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/acs")
      .then(res => res.json())
      .then(d => setAcsOptions(d.acs || []))
      .catch(e => console.error("Error cargando analistas", e));

    fetch("/api/fuentes")
      .then(res => res.json())
      .then(d => setFuentesOptions(d.fuentes || []))
      .catch(e => console.error("Error cargando fuentes", e));

    fetch("/api/tipos-tarea")
      .then(res => res.json())
      .then(d => setTiposOptions(d.tipos || []))
      .catch(e => console.error("Error cargando tipos de tarea", e));
  }, []);

  // Leer CUIT y AC pre-completados desde query params (venimos de GNS Ofertantes)
  const searchParams = useSearchParams();
  useEffect(() => {
    const cuitParam = searchParams.get("cuit");
    if (cuitParam) {
      const clean = cuitParam.replace(/\D/g, "");
      if (clean.length === 11) {
        setSearchMode("cuit");
        setQuery(clean);
      }
    }
    const acParam = searchParams.get("ac");
    if (acParam) setPendingAcEmail(acParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando los ACs cargan, pre-completar el selector si tenemos un AC pendiente
  useEffect(() => {
    if (!pendingAcEmail || acsOptions.length === 0) return;
    const match = acsOptions.find(
      (ac) => ac.email.toLowerCase() === pendingAcEmail.toLowerCase()
    );
    if (match) {
      setAcEmail(match.email);
      setAcCodigo(match.codigo || "");
      setAcSearchQuery(`${match.nombre} - ${match.email}`);
    } else {
      // Si no hay match exacto, al menos pre-cargamos el email en bruto
      setAcEmail(pendingAcEmail);
      setAcSearchQuery(pendingAcEmail);
    }
    setPendingAcEmail(null); // limpiar para no re-aplicar
  }, [acsOptions, pendingAcEmail]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAcDropdownOpen(false);
      }
      if (fuenteDropdownRef.current && !fuenteDropdownRef.current.contains(e.target as Node)) {
        setIsFuenteDropdownOpen(false);
      }
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(e.target as Node)) {
        setIsTipoDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const [status, setStatus] = useState<"idle" | "searching" | "done">("idle");
  const [source, setSource] = useState<"crm" | "metabase" | "base_clave" | "not_found" | null>(null);
  
  const [data, setData] = useState<LeadData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [copiedLead, setCopiedLead] = useState(false);
  const [isCopyingLead, setIsCopyingLead] = useState(false);

  const [copiedTarea, setCopiedTarea] = useState(false);
  const [isCopyingTarea, setIsCopyingTarea] = useState(false);

  // Selector mÃºltiple
  const [searchResultsOptions, setSearchResultsOptions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Expresiones regulares
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acEmail);
  const queryNorm = query.replace(/\D/g, "");
  const isValidCuit = searchMode === "cuit" ? queryNorm.length === 11 : true;
  const isValidRs = searchMode === "razon_social" ? query.trim().length >= 3 : true;
  const isValidNombreApellido = searchMode === "nombre_apellido" ? query.trim().length >= 3 : true;
  const isSearchValid = isValidEmail && isValidCuit && isValidRs && isValidNombreApellido && query.trim() !== "";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSearchValid) return;

    setErrorMsg("");
    setSource(null);
    setData(null);
    setCopiedLead(false);
    setCopiedTarea(false);
    
    try {
      setStatus("searching");
      
      // FunciÃ³n helper para preview
      const getPreview = async (email: string) => {
        try {
          const prefix = acCodigo || email.substring(0, 2).toUpperCase();
          const resLead = await fetch(`/api/leads/last-id?prefix=${prefix}&sheet=leads`).catch(() => null);
          
          let maxLead = 0;
          if (resLead && resLead.ok) maxLead = (await resLead.json()).maxNumber;
          
          const date = new Date();
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          const fecha = `${mm}/${dd}/${yyyy}`;
          
          const lead_id = `${prefix}${maxLead + 1}`;
          return { lead_id, tarea_id: lead_id, fecha };
        } catch {
          return { lead_id: "-", tarea_id: "-", fecha: "-" };
        }
      };

      const res = await fetch("/api/leads/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acEmail, searchType: searchMode, query: searchMode === "cuit" ? queryNorm : query })
      });


      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Error ${res.status}`);
      }

      const resData = await res.json();
      setSource(resData.source);
      
      // Armar la estructura del estado segÃºn el resultado
      const baseData: LeadData = {
        acEmail,
        cuit: searchMode === "cuit" ? queryNorm : "",
        fuente: "", 
        nombre: "",
        apellido: "",
        id_usuario: "",
        provincia: "",
        partido: "",
        telefono: "",
        email: "",
        razon_social: "",
        ofrecio: "0",
        oferto: "0",
      };


      if (resData.source === "crm" && searchMode === "cuit" && resData.data) {
        // Mapear un solo CRM. TambiÃ©n generar tarea_id para associated task.
        const dt = resData.data;
        const crmAC = dt["ac asignado"] || dt["ac_asignado"] || dt["email ac"] || baseData.acEmail;
        const crmLeadId = dt["#"] || dt["leadid"] || dt["lead id"] || dt["id"] || dt["numero"] || "";
        const crmFecha = dt["fecha"] || dt["fecha asignacion"] || dt["fecha de asignaciÃ³n"] || dt["fecha de asignacion"] || "";
        
        // Generar tarea_id independiente para la tarea nueva asociada a este lead CRM
        const tareaPreview = await getPreview(acEmail);
        
        setData({
          ...baseData,
          lead_id: crmLeadId,
          tarea_id: `${tareaPreview.lead_id}`,
          fecha: crmFecha,
          acEmail: crmAC,
          nombre: dt["nombre"] || "",
          apellido: dt["apellido"] || "",
          id_usuario: dt["id cliente"] || dt["id_usuario"] || "",
          provincia: dt["provincia usuario"] || dt["provincia"] || "",
          partido: dt["partido usuario"] || dt["partido"] || "",
          telefono: dt["telÃ©fono"] || dt["telefono"] || "",
          email: dt["email"] || "",
          razon_social: dt["razÃ³n social"] || dt["razon_social"] || "",
          fuente: dt["fuente"] || "",
          source: "crm",
        });
      } else if (Array.isArray(resData.data) && resData.data.length > 0) {
        const preview = await getPreview(baseData.acEmail);
        
        if (resData.data.length === 1) {
          const dt = resData.data[0];
          
          let leadIdToUse = preview.lead_id;
          let fechaToUse = preview.fecha;
          let acToUse = baseData.acEmail;
          let fuenteToUse = "";
          const dtSource = dt.source || resData.source;

          if (dtSource === "crm") {
             leadIdToUse = dt["#"] || dt["leadid"] || dt["lead id"] || dt["id"] || dt["numero"] || "";
             fechaToUse = dt["fecha"] || dt["fecha asignacion"] || dt["fecha de asignacion"] || "";
             acToUse = dt["ac asignado"] || dt["ac_asignado"] || dt["email ac"] || acToUse;
             fuenteToUse = dt["fuente"] || "";
          }

          setData({
            ...baseData,
            lead_id: leadIdToUse,
            tarea_id: preview.tarea_id,
            fecha: fechaToUse,
            acEmail: acToUse,
            fuente: fuenteToUse,
            nombre: dt.nombre || "",
            apellido: dt.apellido || "",
            id_usuario: dt.id_usuario || dt["id cliente"] || "",
            provincia: dt.provincia || dt["provincia usuario"] || "",
            partido: dt.partido || dt["partido usuario"] || "",
            telefono: dt.telefono || dt["telÃ©fono"] || "",
            email: dt.email || "",
            cuit: dt.cuit || dt["cuit"] || baseData.cuit,
            razon_social: dt.razon_social || dt["razÃ³n social"] || "",
            ofrecio: dt.ofrecio || "0",
            oferto: dt.oferto || "0",
            tarea_texto: dt.tarea_texto || computeTareaText(dt),
            source: dtSource,
          });
          setSource(dtSource);
        } else {
          setSearchResultsOptions(resData.data);
          setShowModal(true);
          setData({ ...baseData, lead_id: preview.lead_id, tarea_id: preview.tarea_id, fecha: preview.fecha });
        }
      } else {
        const preview = await getPreview(baseData.acEmail);
        setData({ ...baseData, lead_id: preview.lead_id, tarea_id: preview.tarea_id, fecha: preview.fecha });
      }

      setStatus("done");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al buscar");
      setStatus("idle");
    }
  };

  const handleSelectUser = (dt: any) => {
    if (!data) return;
    const dtSource = dt.source || source;
    
    let leadIdToUse = data.lead_id;
    let fechaToUse = data.fecha;
    let acToUse = data.acEmail;
    let fuenteToUse = "";
    
    if (dtSource === "crm") {
       leadIdToUse = dt["#"] || dt["leadid"] || dt["lead id"] || dt["id"] || dt["numero"] || "";
       fechaToUse = dt["fecha"] || dt["fecha asignacion"] || dt["fecha de asignacion"] || "";
       acToUse = dt["ac asignado"] || dt["ac_asignado"] || dt["email ac"] || acToUse;
       fuenteToUse = dt["fuente"] || "";
    }

    setData({
      ...data,
      lead_id: leadIdToUse,
      fecha: fechaToUse,
      acEmail: acToUse,
      fuente: fuenteToUse,
      nombre: dt.nombre || "",
      apellido: dt.apellido || "",
      id_usuario: dt.id_usuario || dt["id cliente"] || "",
      provincia: dt.provincia || dt["provincia usuario"] || "",
      partido: dt.partido || dt["partido usuario"] || "",
      telefono: dt.telefono || dt["telÃ©fono"] || "",
      email: dt.email || "",
      cuit: dt.cuit || dt["cuit"] || data.cuit,
      razon_social: dt.razon_social || dt["razÃ³n social"] || "",
      ofrecio: dt.ofrecio || "0",
      oferto: dt.oferto || "0",
      tarea_texto: dt.tarea_texto || computeTareaText(dt),
      source: dtSource,
    });
    setSource(dtSource);
    setShowModal(false);
  };

  const handleChangeField = (field: keyof LeadData, value: string) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleCopyLead = async () => {
    if (!data) return;
    try {
      setIsCopyingLead(true);
      setErrorMsg("");

      const prefix = acCodigo || data.acEmail.substring(0, 2).toUpperCase();
      let finalLeadID = data.lead_id;
      let finalFecha = data.fecha;

      if (source !== "crm") {
        const resId = await fetch(`/api/leads/last-id?prefix=${prefix}&sheet=leads`);
        if (!resId.ok) throw new Error("Error al obtener Ãºltimo ID de leads");
        const { maxNumber } = await resId.json();
        
        finalLeadID = `${prefix}${maxNumber + 1}`;
        
        const date = new Date();
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        finalFecha = `${mm}/${dd}/${yyyy}`;
      }

      // A:LeadID, B:Fecha, C:AC, D:Fuente, E:Nombre, F:Apell, G:ID, H:Prov, I:Part, J:Tel, K:Email, L:CUIT, M:Razon
      // N-V: 9 celdas vacÃ­as | W: Comentario | X-AD: 7 celdas vacÃ­as | AE: Creado Por
      const columns = [
        finalLeadID,
        finalFecha,
        data.acEmail,
        data.fuente,
        data.nombre,
        data.apellido,
        data.id_usuario,
        data.provincia,
        data.partido,
        data.telefono,
        data.email,
        data.cuit,
        data.razon_social,
        "", "", "", "", "", "", "", "", "", // N-V (9 blancos)
        data.comentario || "",              // W
        "", "", "", "", "", "", "",         // X-AD (7 blancos)
        data.creado_por || ""              // AE
      ];

      const tsvContent = columns.join('\t');
      await navigator.clipboard.writeText(tsvContent);
      
      // Update UI state with real fetched values
      setData(prev => prev ? { ...prev, lead_id: finalLeadID, fecha: finalFecha } : null);
      
      setCopiedLead(true);
      setTimeout(() => setCopiedLead(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al generar TSV para Lead: " + err.message);
    } finally {
      setIsCopyingLead(false);
    }
  };

  const computeTareaText = (dt: any) => {
    if (!dt) return "";
    const io = Number(dt.ofrecio) || 0;
    const ia = Number(dt.oferto) || 0;
    if (io === 1 && ia === 1) return "Â¡TenÃ©s una Nueva Sociedad asignada! Este cliente ofrecio y oferto tropas. Llamalo y dejÃ¡ un comentario";
    if (io === 1 && ia === 0) return "Â¡TenÃ©s una Nueva Sociedad asignada! Este cliente ofrecio una tropa. Llamalo y dejÃ¡ un comentario";
    if (io === 0 && ia === 1) return "Â¡TenÃ©s una Nueva Sociedad asignada! Este cliente oferto por una tropa. Llamalo y dejÃ¡ un comentario";
    return "Â¡TenÃ©s una Nueva Sociedad asignada! Llamalo y dejÃ¡ un comentario";
  };
  
  const getFullNombreLead = () => {
    if (!data) return "";
    let fullName = data.razon_social;
    if (data.nombre) {
        fullName += ` - ${data.nombre}`;
        if (data.apellido) fullName += ` ${data.apellido}`;
    }
    return fullName;
  }

  const handleCopyTarea = async () => {
    if (!data) return;
    try {
      setIsCopyingTarea(true);
      setErrorMsg("");

      const prefix = acCodigo || acEmail.substring(0, 2).toUpperCase();
      let finalTareaID = data.tarea_id || "";
      
      // Si aÃºn no hay tarea_id generado, obtenerlo ahora
      if (!finalTareaID || finalTareaID === "A calcular...") {
        const resId = await fetch(`/api/leads/last-id?prefix=${prefix}&sheet=leads`);
        if (!resId.ok) throw new Error("Error al obtener Ãºltimo ID de tareas");
        const { maxNumber } = await resId.json();
        finalTareaID = `${prefix}${maxNumber + 1}`;
      }
      
      const date = new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const finalFecha = `${mm}/${dd}/${yyyy}`;

      // A:ID Tarea, B:ID Lead, C:Titulo, D:AC, E:Tarea texto, F:Fecha, G:Estado
      // H: vaciÃ³ | I: Creado Por | J-K: vacÃ­os | L: Tipo
      const finalTitulo = data.titulo_tarea ?? getFullNombreLead();
      const finalFechaTarea = data.fecha_tarea ?? finalFecha;
      const finalEstado = data.estado_tarea ?? "Pendiente";
      const columns = [
        finalTareaID,
        data.lead_id || "",
        finalTitulo,
        data.acEmail,
        data.tarea_texto || "",
        finalFechaTarea,
        finalEstado,
        "",                          // H (vacÃ­o)
        data.creado_por_tarea || "", // I: Creado Por
        "", "",                      // J-K (vacÃ­os)
        data.tipo_tarea || ""        // L: Tipo
      ];

      const tsvContent = columns.join('\t');
      await navigator.clipboard.writeText(tsvContent);
      
      setData(prev => prev ? { ...prev, tarea_id: finalTareaID } : null);
      
      setCopiedTarea(true);
      setTimeout(() => setCopiedTarea(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al generar TSV para Tarea: " + err.message);
    } finally {
      setIsCopyingTarea(false);
    }
  };

  const fieldsConfig = [
    { label: "1. Lead ID", key: "lead_id", value: data?.lead_id || "A calcular...", readonly: false },
    { label: "2. Fecha AsignaciÃ³n", key: "fecha", value: data?.fecha || "A calcular...", readonly: false },
    { label: "3. AC asignado", key: "acEmail", type: "text", readonly: false },
    { label: "4. Fuente", key: "fuente", type: "text", readonly: false },
    { label: "5. Nombre", key: "nombre", type: "text", readonly: false },
    { label: "6. Apellido", key: "apellido", type: "text", readonly: false },
    { label: "7. ID Cliente", key: "id_usuario", type: "text", readonly: false },
    { label: "8. Provincia", key: "provincia", type: "text", readonly: false },
    { label: "9. Partido", key: "partido", type: "text", readonly: false },
    { label: "10. TelÃ©fono", key: "telefono", type: "text", readonly: false },
    { label: "11. Email", key: "email", type: "text", readonly: false },
    { label: "12. CUIT", key: "cuit", type: "text", readonly: false },
    { label: "13. RazÃ³n Social", key: "razon_social", type: "text", readonly: false },
    { label: "Comentario (col. W)", key: "comentario", type: "text", readonly: false },
    { label: "Creado Por (col. AE)", key: "creado_por", type: "select", readonly: false },
  ];

  const todayFormatted = (() => {
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  })();

  const tareaFieldsConfig = [
    { label: "1. ID Tarea", key: "tarea_id", value: data?.tarea_id || "A calcular...", readonly: false },
    { label: "2. ID Lead", key: "lead_id", value: data?.lead_id || "-", readonly: false },
    { label: "3. TÃ­tulo Lead", key: "titulo_tarea", value: data?.titulo_tarea ?? getFullNombreLead(), readonly: false },
    { label: "4. AC Asignado", key: "acEmail", value: data?.acEmail || "-", readonly: false },
    { label: "5. Tarea", key: "tarea_texto", value: data?.tarea_texto || "", type: "text", readonly: false },
    { label: "6. Fecha Tarea", key: "fecha_tarea", value: data?.fecha_tarea ?? todayFormatted, readonly: false },
    { label: "7. Estado", key: "estado_tarea", value: data?.estado_tarea ?? "Pendiente", readonly: false },
    { label: "Creado Por (col. I)", key: "creado_por_tarea", value: data?.creado_por_tarea || "", type: "select", readonly: false },
    { label: "Tipo (col. L)", key: "tipo_tarea", value: data?.tipo_tarea || "", type: "combobox", readonly: false },
  ];

  const isReadOnly = false; // Todos los campos son editables independientemente de la fuente

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-primary" />
          Crear Lead
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          BÃºsqueda para identificar datos demogrÃ¡ficos de clientes e inicializar seguimiento.
        </p>
      </div>

      {/* Formulario de BÃºsqueda */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        
        {/* Toggle Mode */}
        <div className="flex bg-secondary w-fit rounded-lg p-1 border border-border">
          <button 
            type="button"
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", searchMode === "cuit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => { setSearchMode("cuit"); setQuery(""); }}
          >
            Buscar por CUIT
          </button>
          <button 
            type="button"
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", searchMode === "razon_social" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => { setSearchMode("razon_social"); setQuery(""); }}
          >
            Buscar por RazÃ³n Social
          </button>
          <button 
            type="button"
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", searchMode === "nombre_apellido" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => { setSearchMode("nombre_apellido"); setQuery(""); }}
          >
            Buscar por Nombre/Apellido
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full" ref={dropdownRef}>
            <label className="text-sm font-semibold text-foreground">Asociado Comercial</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe para buscar comercial..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 pr-8"
                value={acSearchQuery}
                onChange={(e) => {
                  setAcSearchQuery(e.target.value);
                  setAcEmail(""); 
                  setIsAcDropdownOpen(true);
                }}
                onFocus={() => setIsAcDropdownOpen(true)}
                required
              />
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
              
              {isAcDropdownOpen && (
                <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                  {acsOptions
                    .filter(ac => 
                      ac.nombre.toLowerCase().includes(acSearchQuery.toLowerCase()) || 
                      ac.email.toLowerCase().includes(acSearchQuery.toLowerCase())
                    )
                    .map((ac, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 border-b border-border/50 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAcEmail(ac.email);
                          setAcCodigo(ac.codigo || "");
                          setAcSearchQuery(`${ac.nombre} - ${ac.email}`);
                          setIsAcDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium text-foreground">{ac.nombre}</div>
                        <div className="text-xs text-muted-foreground">{ac.email}</div>
                      </li>
                  ))}
                  {acsOptions.length > 0 && acsOptions.filter(ac => 
                      ac.nombre.toLowerCase().includes(acSearchQuery.toLowerCase()) || 
                      ac.email.toLowerCase().includes(acSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <li className="px-3 py-4 text-sm text-center text-muted-foreground">
                        No se encontraron analistas
                      </li>
                  )}
                  {acsOptions.length === 0 && (
                      <li className="px-3 py-4 text-sm text-center text-muted-foreground flex justify-center items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin"/> Cargando...
                      </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-2 w-full">
            <label className="text-sm font-semibold text-foreground">
              {searchMode === "cuit" ? "CUIT Sociedad" : searchMode === "razon_social" ? "RazÃ³n Social" : "Nombre o Apellido"}
            </label>
            <input
              type="text"
              placeholder={
                searchMode === "cuit"
                  ? "Sin guiones o con formato local"
                  : searchMode === "razon_social"
                  ? "Escribe al menos 3 caracteres..."
                  : "Escribe nombre, apellido o ambos..."
              }
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isSearchValid || status === "searching"}
            className="w-full md:w-auto h-[42px] px-6 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "searching" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <p className={cn("flex items-center gap-1", acEmail && !isValidEmail && "text-rose-400 font-medium")}>
            Formato Email: {isValidEmail ? "OK" : "Pendiente"}
          </p>
          {searchMode === "cuit" ? (
            <p className={cn("flex items-center gap-1", query && !isValidCuit && "text-rose-400 font-medium")}>
              CUIT: {isValidCuit ? "11 dÃ­gitos OK" : `${queryNorm.length}/11 dÃ­gitos`}
            </p>
          ) : searchMode === "razon_social" ? (
            <p className={cn("flex items-center gap-1", query && !isValidRs && "text-rose-400 font-medium")}>
              RazÃ³n Social: {isValidRs ? "OK" : "MÃ­n. 3 caracteres"}
            </p>
          ) : (
            <p className={cn("flex items-center gap-1", query && !isValidNombreApellido && "text-rose-400 font-medium")}>
              Nombre/Apellido: {isValidNombreApellido ? "OK" : "MÃ­n. 3 caracteres"}
            </p>
          )}
          {searchMode === "nombre_apellido" && (
            <p className="text-xs text-blue-400 flex items-center gap-1">
              Solo busca en Metabase
            </p>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-400/10 border border-rose-400/20 text-rose-400 text-sm">
          {errorMsg}
        </div>
      )}

      {status === "searching" && !data && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground animate-pulse">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p>{searchMode === "nombre_apellido" ? "Consultando Metabase..." : "Consultando bases de datos (CRM, Metabase, Base Clave)..."}</p>
        </div>
      )}

      {data && source && status === "done" && (
        <div className="space-y-6">
          
          {/* SECCIÃ“N 1: Fila de Lead */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in relative z-20">
            <div className="px-5 py-4 border-b border-border bg-secondary/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  Fila de Lead
                  {source === "crm" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20 uppercase tracking-wider">
                      Lead ya registrado en CRM
                    </span>
                  )}
                  {source === "metabase" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 uppercase tracking-wider">
                      Datos de Metabase
                    </span>
                  )}
                  {source === "base_clave" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-500 border border-emerald-400/20 uppercase tracking-wider">
                      Datos de Base Clave
                    </span>
                  )}
                  {source === "not_found" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase tracking-wider">
                      Carga Manual
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {"Revisa y completa todos los campos antes de copiar."}
                </p>
              </div>

              <button
                onClick={handleCopyLead}
                disabled={isCopyingLead || copiedLead}
                className={cn(
                  "shrink-0 h-[38px] px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all",
                  copiedLead
                    ? "bg-positive/20 text-positive border border-positive/30"
                    : "bg-background border border-border hover:bg-secondary text-foreground"
                )}
              >
                {isCopyingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : copiedLead ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopyingLead ? "Procesando..." : copiedLead ? "Â¡Fila copiada!" : "Copiar fila (TSV)"}
              </button>
            </div>

            {source === "crm" && data.acEmail.toLowerCase() !== acEmail.toLowerCase() && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm flex items-center gap-2">
                <Info className="w-5 h-5 shrink-0" />
                <p>
                  Esta sociedad ya estÃ¡ generada en el CRM y estÃ¡ asignada a <strong className="font-bold">{data.acEmail}</strong>.
                </p>
              </div>
            )}

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {fieldsConfig.map((field) => {
                  const isAutoReadonly = field.readonly;
                  const valueText = field.value ? field.value : (data[field.key as keyof LeadData] as string);
                  const isEmpty = !field.value && (!valueText || String(valueText).trim() === "");
                  const needsAttention = isEmpty && !isAutoReadonly && !isReadOnly;

                  return (
                    <div key={field.label} className={cn(
                      "flex flex-col gap-1.5 focus-within:relative",
                      field.key === "fuente" && isFuenteDropdownOpen ? "z-50" : "z-10"
                    )} ref={field.key === "fuente" ? fuenteDropdownRef : undefined}>
                      <label className={cn("text-xs font-semibold uppercase tracking-wider", needsAttention ? "text-amber-500" : "text-muted-foreground")}>
                        {field.label}
                      </label>
                      
                      {isAutoReadonly || isReadOnly ? (
                        <div className="px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-muted-foreground min-h-[38px] flex items-center cursor-not-allowed">
                          {valueText || <span className="opacity-40">-</span>}
                        </div>
                      ) : field.key === "fuente" ? (
                        <div className="relative">
                          <input
                            type={field.type}
                            value={valueText}
                            onChange={(e) => {
                              handleChangeField("fuente", e.target.value);
                              setIsFuenteDropdownOpen(true);
                            }}
                            onFocus={() => setIsFuenteDropdownOpen(true)}
                            className={cn(
                              "w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all pr-8",
                              needsAttention ? "border-amber-500/50 bg-amber-500/5" : "border-border"
                            )}
                            placeholder="Completar..."
                          />
                          <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                          {isFuenteDropdownOpen && (
                            <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                              {fuentesOptions.filter(f => f.toLowerCase().includes(String(valueText).toLowerCase())).map((f, i) => (
                                <li key={i} className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 border-b border-border/50 last:border-0 font-medium text-foreground" onMouseDown={(e) => e.preventDefault()} onClick={() => { handleChangeField("fuente", f); setIsFuenteDropdownOpen(false); }}>{f}</li>
                              ))}
                              {fuentesOptions.length > 0 && fuentesOptions.filter(f => f.toLowerCase().includes(String(valueText).toLowerCase())).length === 0 && (
                                <li className="px-3 py-3 text-sm text-center text-muted-foreground">No coincidencias</li>
                              )}
                            </ul>
                          )}
                        </div>
                      ) : field.key === "creado_por" ? (
                        <div className="relative">
                          <select
                            value={valueText || ""}
                            onChange={(e) => handleChangeField("creado_por", e.target.value)}
                            className={cn(
                              "w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all appearance-none pr-8",
                              needsAttention ? "border-amber-500/50 bg-amber-500/5" : "border-border"
                            )}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="jtonon@decampoacampo.com">jtonon@decampoacampo.com</option>
                            <option value="ptaffarel@decampoacampo.com">ptaffarel@decampoacampo.com</option>
                            <option value="jsineriz@decampoacampo.com">jsineriz@decampoacampo.com</option>
                            <option value="sdewey@decampoacampo.com">sdewey@decampoacampo.com</option>
                            <option value="arivas@decampoacampo.com">arivas@decampoacampo.com</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={valueText}
                          onChange={(e) => handleChangeField(field.key as keyof LeadData, e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all",
                            needsAttention ? "border-amber-500/50 bg-amber-500/5" : "border-border"
                          )}
                          placeholder="Completar..."
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECCIÃ“N 2: Fila de Tarea (siempre visible, incluso para leads del CRM) */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in relative z-10">
            <div className="px-5 py-4 border-b border-border bg-secondary/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  Fila de Tarea
                  {source === "crm" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20 uppercase tracking-wider">
                      Nueva tarea sobre lead existente
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {source === "crm"
                    ? "El lead ya existe en el CRM. PodÃ©s crear y copiar una nueva tarea asociada a Ã©l."
                    : "Copia esta fila en la hoja de \"Tareas\" para documentar el inicio del ciclo comercial."}
                </p>
              </div>

              <button
                onClick={handleCopyTarea}
                disabled={isCopyingTarea || copiedTarea}
                className={cn(
                  "shrink-0 h-[38px] px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all",
                  copiedTarea
                    ? "bg-positive/20 text-positive border border-positive/30"
                    : "bg-background border border-border hover:bg-secondary text-foreground"
                )}
              >
                {isCopyingTarea ? <Loader2 className="w-4 h-4 animate-spin" /> : copiedTarea ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopyingTarea ? "Procesando..." : copiedTarea ? "Â¡Fila copiada!" : "Copiar fila (TSV)"}
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {tareaFieldsConfig.map((field) => (
                  <div
                    key={field.label}
                    className={cn(
                      "flex flex-col gap-1.5 focus-within:relative",
                      field.label === "5. Tarea" ? "lg:col-span-4" : "",
                      field.type === "combobox" ? "z-30" : field.type === "select" ? "" : ""
                    )}
                    ref={field.type === "combobox" ? tipoDropdownRef : undefined}
                  >
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </label>

                    {field.type === "select" ? (
                      <div className="relative">
                        <select
                          value={field.value as string}
                          onChange={(e) => handleChangeField(field.key as keyof LeadData, e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all appearance-none pr-8"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="jtonon@decampoacampo.com">jtonon@decampoacampo.com</option>
                          <option value="ptaffarel@decampoacampo.com">ptaffarel@decampoacampo.com</option>
                          <option value="jsineriz@decampoacampo.com">jsineriz@decampoacampo.com</option>
                          <option value="sdewey@decampoacampo.com">sdewey@decampoacampo.com</option>
                          <option value="arivas@decampoacampo.com">arivas@decampoacampo.com</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    ) : field.type === "combobox" ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={field.value as string}
                          onChange={(e) => {
                            handleChangeField(field.key as keyof LeadData, e.target.value);
                            setIsTipoDropdownOpen(true);
                          }}
                          onFocus={() => setIsTipoDropdownOpen(true)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all pr-8"
                          placeholder="Escribe o selecciona..."
                        />
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
                        {isTipoDropdownOpen && (
                          <ul className="absolute z-50 bottom-full mb-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                            {tiposOptions
                              .filter(t => t.toLowerCase().includes(String(field.value || "").toLowerCase()))
                              .map((t, i) => (
                                <li
                                  key={i}
                                  className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 border-b border-border/50 last:border-0 font-medium text-foreground"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    handleChangeField("tipo_tarea", t);
                                    setIsTipoDropdownOpen(false);
                                  }}
                                >
                                  {t}
                                </li>
                              ))}
                            {tiposOptions.length > 0 &&
                              tiposOptions.filter(t => t.toLowerCase().includes(String(field.value || "").toLowerCase())).length === 0 && (
                              <li className="px-3 py-3 text-sm text-center text-muted-foreground">No coincidencias â€” se guardarÃ¡ el texto ingresado</li>
                            )}
                            {tiposOptions.length === 0 && (
                              <li className="px-3 py-4 text-sm text-center text-muted-foreground flex justify-center items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={field.value as string}
                        onChange={(e) => handleChangeField(field.key as keyof LeadData, e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                        placeholder="Completar..."
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modal MÃºltiples Resultados */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden max-h-[80vh]">
            <div className="p-5 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-lg text-foreground">MÃºltiples resultados encontrados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                La bÃºsqueda encontrÃ³ mÃ¡s de un contacto asociado. Selecciona cuÃ¡l cargar:
              </p>
            </div>
            <div className="overflow-y-auto p-2">
              <div className="flex flex-col gap-2 p-3">
                {searchResultsOptions.map((opt, idx) => {
                  let badge = null;
                  const itemSrc = opt.source || "metabase";
                  if (itemSrc === "crm") {
                    badge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-500 border border-violet-400/20 uppercase tracking-wider">CRM</span>;
                  } else if (itemSrc === "metabase") {
                    badge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-500 border border-blue-400/20 uppercase tracking-wider">Metabase</span>;
                  } else if (itemSrc === "base_clave") {
                    badge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-500 border border-emerald-400/20 uppercase tracking-wider">Base Clave</span>;
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectUser(opt)}
                      className="flex flex-col text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                          {opt.razon_social || `${opt.nombre} ${opt.apellido}`.trim()}
                          {badge}
                        </span>
                        <span className="text-xs text-primary font-medium flex items-center gap-1 shrink-0">
                          Seleccionar <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-2">
                        {opt.cuit && <span className="text-xs text-muted-foreground"><strong className="font-medium mr-1">CUIT:</strong>{opt.cuit}</span>}
                        {(opt.nombre || opt.apellido) && <span className="text-xs text-muted-foreground"><strong className="font-medium mr-1">Usuario:</strong>{(opt.nombre + " " + (opt.apellido || "")).trim()}</span>}
                        {opt.id_usuario && <span className="text-xs text-muted-foreground"><strong className="font-medium mr-1">ID Usuario:</strong>{opt.id_usuario}</span>}
                        {opt.email && <span className="text-xs text-muted-foreground"><strong className="font-medium mr-1">Email:</strong>{opt.email}</span>}
                        {opt.ultimo_ingreso && (
                          <span className="text-xs text-muted-foreground">
                            <strong className="font-medium mr-1">Ãšltimo ingreso:</strong>
                            {new Date(opt.ultimo_ingreso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-border bg-secondary/30 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-secondary transition-all"
              >
                Cerrar y cargar vacÃ­o
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CrearLeadPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Cargando...</div>}>
      <CrearLeadPageContent />
    </Suspense>
  );
}

