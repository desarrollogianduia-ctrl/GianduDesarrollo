import React from 'react';
import { BookOpen, ShieldCheck, FileText, Info, ExternalLink } from 'lucide-react';

export function NormativasView() {
  const normativas = [
    {
      title: 'Código Alimentario Argentino (CAA)',
      description: 'Cuerpo normativo que regula todos los alimentos, condimentos, bebidas y sus materias primas que se elaboran, fraccionan, conservan, transportan, expenden o exponen en Argentina.',
      link: 'https://www.argentina.gob.ar/anmat/codigoalimentario',
      category: 'General'
    },
    {
      title: 'Rotulado Nutricional Frontal (Ley 27.642)',
      description: 'Regulación sobre el etiquetado de advertencia (octógonos negros) para productos con exceso de nutrientes críticos.',
      link: 'https://www.argentina.gob.ar/justicia/derechofacil/leyes-en-fomato-facil/ley-de-promocion-de-la-alimentacion-saludable',
      category: 'Etiquetado'
    },
    {
      title: 'ANMAT - Listado de Aditivos',
      description: 'Base de datos actualizada sobre aditivos autorizados, dosis máximas y funciones tecnológicas permitidas.',
      link: 'https://www.argentina.gob.ar/anmat',
      category: 'Ingredientes'
    },
    {
      title: 'Buenas Prácticas de Manufactura (BPM)',
      description: 'Requisitos generales de higiene y procedimientos operativos para la elaboración de alimentos seguros.',
      link: 'https://www.argentina.gob.ar/servicio/obtener-certificado-de-buenas-practicas-de-manufactura-bpm',
      category: 'Calidad'
    }
  ];

  return (
    <div className="p-8 space-y-8 h-full custom-scrollbar overflow-y-auto pb-20">
      <div className="max-w-4xl space-y-2">
        <h3 className="text-2xl font-light italic">Repositorio Normativo</h3>
        <p className="text-[var(--text-s)] text-sm leading-relaxed font-medium uppercase tracking-[2px] opacity-40">
          Marco legal y regulatorio para la industria alimentaria en Argentina.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {normativas.map((norm, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6 group hover:border-[var(--accent)]/30 transition-all flex flex-col">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <div className="badge">{norm.category}</div>
            </div>
            
            <div className="flex-1 space-y-3">
              <h4 className="text-lg font-bold text-white group-hover:text-[var(--accent)] transition-colors">{norm.title}</h4>
              <p className="text-xs text-[var(--text-s)] leading-relaxed">{norm.description}</p>
            </div>

            <a 
              href={norm.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[3px] text-white/30 hover:text-white transition-all pt-4 border-t border-white/5 w-fit"
            >
              Consultar Fuente <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl flex gap-6 items-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Aviso Tecnológico</h5>
          <p className="text-xs text-amber-500/60 leading-relaxed font-medium">
            Toda formulación técnica generada en este sistema debe ser validada contra el CAA vigente antes de su escalado industrial. 
            El asistente AI puede ayudar a interpretar estas normativas pero no reemplaza la validación legal periódica.
          </p>
        </div>
      </div>
    </div>
  );
}
