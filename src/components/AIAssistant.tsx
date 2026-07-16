import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Loader2, Bot, User, Trash2, Globe, BookOpen, Plus, X, Search, 
  FileText, Layout, Database, BrainCircuit, Microscope, Wand2, Check, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { chatAssistant, extractKnowledgeInsights, generateIngredientTechSheet } from '../services/aiService';
import { DevelopmentProject, Recipe, Ingredient, KnowledgeDocument, KnowledgeCategory, KnowledgeType } from '../types';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface AIAssistantProps {
  developments: DevelopmentProject[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  knowledge: KnowledgeDocument[];
  onSaveKnowledge: (doc: KnowledgeDocument) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
}

const KNOWLEDGE_CATEGORIES: { id: KnowledgeCategory; label: string; icon: any }[] = [
  { id: 'helados', label: 'Helados', icon: Database },
  { id: 'semielaborados', label: 'Semielaborados', icon: Database },
  { id: 'pasteleria', label: 'Pastelería', icon: Database },
  { id: 'paletas', label: 'Paletas', icon: Database },
  { id: 'popolo', label: 'Popolo', icon: Database },
  { id: 'chocolates', label: 'Chocolates', icon: Database },
  { id: 'vitrina', label: 'Vitrina', icon: Database },
  { id: 'terceros', label: 'Terceros', icon: Database },
];

export function AIAssistant({ 
  developments, 
  recipes, 
  ingredients, 
  knowledge, 
  onSaveKnowledge, 
  onDeleteKnowledge 
}: AIAssistantProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // New Knowledge Doc State
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [previewInsights, setPreviewInsights] = useState<{ title: string; insights: string[] } | null>(null);
  
  const [newDoc, setNewDoc] = useState<Partial<KnowledgeDocument>>({
    title: '',
    content: '',
    category: 'helados',
    type: 'general'
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeTab]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatAssistant(input, messages, {
        developments,
        recipes,
        ingredients,
        knowledge
      });

      const modelMessage: Message = {
        role: 'model',
        parts: [{ text: response }]
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        role: 'model',
        parts: [{ text: 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.' }]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractInsights = async () => {
    if (messages.length === 0 || isExtracting) return;
    
    setIsExtracting(true);
    try {
      const conversation = messages.map(m => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.parts[0].text}`).join('\n\n');
      const result = await extractKnowledgeInsights(conversation);
      setPreviewInsights(result);
      // Pre-fill new doc
      setNewDoc({
        title: result.title,
        content: result.insights.map(i => `- ${i}`).join('\n'),
        category: 'helados',
        type: 'insight'
      });
      setIsAddingDoc(true);
    } catch (error) {
       alert("Error al extraer insights.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateTechSheet = async () => {
    if (!newDoc.title || isGeneratingSheet) return;
    
    setIsGeneratingSheet(true);
    try {
      const result = await generateIngredientTechSheet(newDoc.title);
      setNewDoc(prev => ({
        ...prev,
        title: result.title,
        content: result.technicalCharacteristics,
        type: 'technical_sheet'
      }));
    } catch (error) {
      alert("Error al generar ficha técnica.");
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const handleSaveDoc = async () => {
    if (!newDoc.title || !newDoc.content || !newDoc.category) return;
    
    const docObj: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      title: newDoc.title,
      content: newDoc.content,
      category: newDoc.category as KnowledgeCategory,
      type: (newDoc.type || 'general') as KnowledgeType,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await onSaveKnowledge(docObj);
    setIsAddingDoc(false);
    setPreviewInsights(null);
    setNewDoc({ title: '', content: '', category: 'helados', type: 'general' });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] relative">
      {/* Header with Tab Switcher */}
      <div className="p-6 border-b border-[var(--border)] shrink-0 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-light italic">Predictor I+D Gianduia</h3>
              <p className="text-[10px] text-[var(--text-s)] uppercase tracking-[3px] font-black">Inteligencia Predictiva y Normativa</p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-[var(--accent)] text-white' : 'text-white/40 hover:text-white'}`}
            >
              Consultor IA
            </button>
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'knowledge' ? 'bg-[var(--accent)] text-white' : 'text-white/40 hover:text-white'}`}
            >
              Base de Datos I+D
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'chat' ? (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6 opacity-40">
                  <Bot size={48} className="text-rose-500" />
                  <div className="space-y-2">
                    <p className="text-lg font-light italic">¿En qué puedo ayudarte hoy?</p>
                    <p className="text-xs leading-relaxed uppercase tracking-widest font-bold">
                      Consultame sobre texturas, estabilidad, normativas o comparativas de tus desarrollos actuales.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-rose-500 text-white'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`max-w-[80%] rounded-[24px] p-5 ${
                      msg.role === 'user' 
                        ? 'bg-zinc-800 text-white rounded-tr-none' 
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-p)] rounded-tl-none'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{msg.parts[0].text}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[24px] rounded-tl-none p-5 text-[var(--text-s)] flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Analizando contexto, base de datos y normativas...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-[var(--surface)] border-t border-[var(--border)] shrink-0">
              <div className="max-w-4xl mx-auto flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe tu consulta aquí..."
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:border-[var(--accent)] transition-all text-white"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-50 transition-opacity">
                    <Globe size={18} />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-[var(--accent)]/20"
                >
                  <Send size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="knowledge"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-lg font-light italic">Repositorio de Conocimiento I+D</h4>
                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Información específica para entrenamiento de la IA</p>
              </div>
              <div className="flex gap-3">
                {messages.length > 0 && (
                  <button 
                    onClick={handleExtractInsights}
                    disabled={isExtracting}
                    className="flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                  >
                    {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                    Extraer de Chat
                  </button>
                )}
                <button 
                  onClick={() => {
                    setNewDoc({ title: '', content: '', category: 'helados', type: 'general' });
                    setIsAddingDoc(true);
                  }}
                  className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/20"
                >
                  <Plus size={16} /> Agregar Información
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {KNOWLEDGE_CATEGORIES.map(category => {
                const docs = knowledge.filter(d => d.category === category.id);
                return (
                  <div key={category.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                        <category.icon size={20} />
                      </div>
                      <span className="badge px-2 py-0.5 text-[8px]">{docs.length} docs</span>
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-black uppercase tracking-widest text-white/60">{category.label}</h5>
                      <div className="space-y-2 pt-2">
                        {docs.length > 0 ? docs.slice(0, 3).map(doc => (
                          <div key={doc.id} className="flex items-center justify-between group">
                            <span className="text-[10px] text-white/40 truncate flex-1 pr-2">{doc.title}</span>
                            <button 
                              onClick={() => onDeleteKnowledge(doc.id)}
                              className="text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )) : (
                          <p className="text-[10px] text-white/10 italic">Sin datos cargados.</p>
                        )}
                        {docs.length > 3 && (
                          <p className="text-[9px] text-[var(--accent)] font-bold italic pt-1">+{docs.length - 3} más...</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Documents List */}
            <div className="space-y-4 pt-4">
              <h5 className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Documentos Recientes</h5>
              <div className="space-y-2">
                {knowledge.length > 0 ? (
                  knowledge.sort((a,b) => b.createdAt - a.createdAt).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/80">{doc.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">{doc.category}</p>
                            <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase font-black">
                              {doc.type === 'technical_sheet' ? 'Materia Prima' : doc.type === 'insight' ? 'Highlight IA' : 'General'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                          onClick={() => onDeleteKnowledge(doc.id)}
                          className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                    <Database size={48} className="mx-auto text-white/5 mb-4" />
                    <p className="text-xs text-white/20 uppercase font-black tracking-widest">No hay información cargada en el repositorio</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Knowledge Modal */}
      <AnimatePresence>
        {isAddingDoc && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[var(--bg)]/95 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90%]"
            >
              <div className="p-8 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h5 className="text-xl font-light italic text-white">Nueva Información</h5>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Información técnica y normativa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddingDoc(false)}
                  className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-4">Tipo de Información</label>
                       <div className="flex gap-2">
                        {[
                          { id: 'general', label: 'General', icon: FileText },
                          { id: 'technical_sheet', label: 'Matería Prima', icon: Microscope },
                          { id: 'insight', label: 'Highlight IA', icon: BrainCircuit }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setNewDoc(prev => ({ ...prev, type: t.id as KnowledgeType }))}
                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${newDoc.type === t.id ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-white/5 border-white/5 text-white/20'}`}
                          >
                            <t.icon size={16} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                          </button>
                        ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-4">Categoría de I+D</label>
                      <div className="grid grid-cols-2 gap-2">
                        {KNOWLEDGE_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setNewDoc(prev => ({ ...prev, category: cat.id }))}
                            className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newDoc.category === cat.id ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-4">
                        {newDoc.type === 'technical_sheet' ? 'Nombre del Ingrediente' : 'Título del Documento'}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder={newDoc.type === 'technical_sheet' ? "Ej. Sacarosa, Maltodextrina..." : "Ej. Normativa Helados 2024"}
                          value={newDoc.title}
                          onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-[var(--accent)] transition-all text-white"
                        />
                        {newDoc.type === 'technical_sheet' && (
                          <button
                            onClick={handleGenerateTechSheet}
                            disabled={!newDoc.title || isGeneratingSheet}
                            className="bg-rose-600 text-white p-4 rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/20"
                            title="Generar Ficha con IA"
                          >
                            {isGeneratingSheet ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {newDoc.type === 'insight' && previewInsights && (
                       <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-2">
                          <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest">Pre-análisis de IA</p>
                          <p className="text-[10px] text-white/60 italic leading-relaxed">
                            Se han extraído {previewInsights.insights.length} puntos técnicos de la conversación.
                          </p>
                       </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-4">
                    {newDoc.type === 'technical_sheet' ? 'Ficha de Características Técnicas' : 'Contenido Técnico'}
                  </label>
                  <textarea 
                    rows={8}
                    placeholder="Pega aquí normativas, fichas técnicas, consejos de formulación o cualquier dato que desees que la IA conozca..."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-[var(--accent)] transition-all text-white resize-none custom-scrollbar"
                  />
                </div>
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-[var(--border)] flex justify-end gap-4 shrink-0">
                <button 
                  onClick={() => setIsAddingDoc(false)}
                  className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[2px] text-white/40 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveDoc}
                  disabled={!newDoc.title || !newDoc.content}
                  className="px-10 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-[2px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-[var(--accent)]/20"
                >
                  Guardar en Repositorio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <p className="text-center pb-4 text-[9px] text-[var(--text-s)] font-bold uppercase tracking-[4px] opacity-20">IA Predictiva v1.5 - I+D Gianduia Hub</p>
    </div>
  );
}
