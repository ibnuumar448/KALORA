"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { BookOpen, ChevronDown, ChevronRight, Video, Plus, Trash2, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type CurriculumDocumentSection = 'textbooks' | 'jamb_past_questions';

type CurriculumDocument = {
  id: string;
  section: CurriculumDocumentSection;
  title: string;
};

const documentSections: { key: CurriculumDocumentSection; label: string }[] = [
  { key: 'textbooks', label: 'Recommended Textbooks' },
  { key: 'jamb_past_questions', label: 'JAMB Past Questions' },
];

const getErrorDetail = (error: unknown) => {
  if (!axios.isAxiosError(error)) return undefined;
  const detail: unknown = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : undefined;
};

export default function CurriculumMgmtPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ 
    name: '', 
    description: '',
    modules: [
      {
        name: '',
        topics: [{ name: '', youtubeUrls: '' }]
      }
    ]
  });
  
  const [showYoutubeModal, setShowYoutubeModal] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [openDocumentSections, setOpenDocumentSections] = useState<Record<string, boolean>>({});
  const [uploadingDocument, setUploadingDocument] = useState<{ subjectId: string; section: string } | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentUploadBusy, setDocumentUploadBusy] = useState(false);

  const fetchCurriculum = async () => {
    try {
      const response = await api.get('/curriculum/subjects');
      setSubjects(response.data);
    } catch (err) {
      console.error('Failed to fetch curriculum', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const progRes = await api.get('/curriculum/programmes');
      const progId = progRes.data.length > 0 ? progRes.data[0].id : null;
      if (!progId) {
        toast.error("No programme exists to attach this subject to!");
        return;
      }

      // Build the nested payload
      const modulesPayload = newSubject.modules.map(mod => ({
        name: mod.name,
        topics: mod.topics.map(top => {
          const urls = top.youtubeUrls ? top.youtubeUrls.split(',').map(u => u.trim()).filter(u => u) : [];
          const resource_slots = urls.map((url, i) => {
            const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
            const videoId = match ? match[1] : url;
            return {
              name: `Video Tutorial ${i + 1}`,
              resource: {
                youtube_video_id: videoId,
                title: `${top.name} - Part ${i + 1}`
              }
            };
          });

          return {
            name: top.name,
            subtopics: [
              {
                name: top.name,
                resource_slots: resource_slots
              }
            ]
          };
        })
      }));

      await api.post('/curriculum/admin/subjects', {
        name: newSubject.name,
        description: newSubject.description,
        programme_id: progId,
        modules: modulesPayload
      });

      setShowSubjectModal(false);
      setNewSubject({ 
        name: '', description: '', 
        modules: [{ name: '', topics: [{ name: '', youtubeUrls: '' }] }] 
      });
      fetchCurriculum();
      toast.success("Syllabus created successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to add syllabus");
    }
  };

  const handleAddYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showYoutubeModal) return;
    try {
      await api.post(`/curriculum/admin/topics/${showYoutubeModal}/youtube-resource`, {
        youtube_url: youtubeUrl
      });
      setShowYoutubeModal(null);
      setYoutubeUrl('');
      fetchCurriculum();
      toast.success("YouTube video embedded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to add YouTube resource");
    }
  };

  const handleDeleteResource = async (slotId: string, title?: string) => {
    if (!confirm(`Are you sure you want to remove this video link: "${title || 'this resource'}"?`)) {
      return;
    }
    try {
      await api.delete(`/curriculum/admin/resource-slots/${slotId}`);
      fetchCurriculum();
      toast.success("Resource link deleted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to delete resource");
    }
  };

  const toggleDocumentSection = (key: string) => {
    setOpenDocumentSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingDocument || !documentFile) return;

    const formData = new FormData();
    formData.append('section', uploadingDocument.section);
    formData.append('title', documentTitle);
    formData.append('file', documentFile);
    setDocumentUploadBusy(true);
    try {
      await api.post(`/curriculum/admin/subjects/${uploadingDocument.subjectId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadingDocument(null);
      setDocumentFile(null);
      setDocumentTitle('');
      await fetchCurriculum();
      toast.success('PDF uploaded successfully');
    } catch (err: unknown) {
      toast.error(getErrorDetail(err) || 'Failed to upload PDF');
    } finally {
      setDocumentUploadBusy(false);
    }
  };

  const handleEditDocumentTitle = async (document: CurriculumDocument) => {
    const title = window.prompt('Document title', document.title);
    if (title === null || title.trim() === document.title) return;
    try {
      await api.patch(`/curriculum/admin/documents/${document.id}`, { title });
      await fetchCurriculum();
      toast.success('Document title updated');
    } catch (err: unknown) {
      toast.error(getErrorDetail(err) || 'Failed to update document title');
    }
  };

  const handleDeleteDocument = async (document: CurriculumDocument) => {
    if (!window.confirm(`Delete "${document.title}"?`)) return;
    try {
      await api.delete(`/curriculum/admin/documents/${document.id}`);
      await fetchCurriculum();
      toast.success('Document deleted');
    } catch (err: unknown) {
      toast.error(getErrorDetail(err) || 'Failed to delete document');
    }
  };

  // UI Helpers for Syllabus Builder
  const addModule = () => {
    setNewSubject(prev => ({
      ...prev,
      modules: [...prev.modules, { name: '', topics: [{ name: '', youtubeUrls: '' }] }]
    }));
  };

  const addTopic = (modIndex: number) => {
    const updated = [...newSubject.modules];
    updated[modIndex].topics.push({ name: '', youtubeUrls: '' });
    setNewSubject({ ...newSubject, modules: updated });
  };

  const updateModule = (index: number, val: string) => {
    const updated = [...newSubject.modules];
    updated[index].name = val;
    setNewSubject({ ...newSubject, modules: updated });
  };

  const updateTopic = (modIndex: number, topIndex: number, field: 'name' | 'youtubeUrls', val: string) => {
    const updated = [...newSubject.modules];
    updated[modIndex].topics[topIndex][field] = val;
    setNewSubject({ ...newSubject, modules: updated });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Curriculum</h2>
          <p className="text-slate-500 mt-1">Build and organize subjects, topics, and video resources.</p>
        </div>
        <Button onClick={() => setShowSubjectModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Syllabus
        </Button>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
          <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No subjects found</h3>
          <p className="mt-1 mb-4 text-sm text-slate-500">Your curriculum is currently empty.</p>
          <Button onClick={() => setShowSubjectModal(true)}>Build Syllabus</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => {
            const isSubjExpanded = expanded[`subj-${subject.id}`];
            return (
              <div key={subject.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpanded(`subj-${subject.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {isSubjExpanded ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                    <h3 className="font-semibold text-slate-900">{subject.name}</h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                    {subject.modules?.length || 0} Modules
                  </span>
                </button>

                {isSubjExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-white">
                    {subject.modules?.map((module: any) => {
                      const isModExpanded = expanded[`mod-${module.id}`];
                      return (
                        <div key={module.id} className="border border-slate-100 rounded-md">
                          <button
                            className="w-full flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-md"
                            onClick={() => toggleExpanded(`mod-${module.id}`)}
                          >
                            {isModExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span className="font-medium text-sm text-slate-800">{module.name}</span>
                          </button>
                          
                          {isModExpanded && (
                            <div className="p-3 pl-9 space-y-3">
                              {module.topics?.map((topic: any) => (
                                <div key={topic.id} className="bg-slate-50/50 border border-slate-100 rounded p-3 text-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-slate-700">{topic.name}</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => setShowYoutubeModal(topic.id)}>
                                      <Video className="w-3 h-3 mr-1" /> Add Video
                                    </Button>
                                  </div>
                                  
                                  <div className="pl-3 border-l-2 border-slate-200 space-y-1 mt-2">
                                    {(() => {
                                      const allSlots = topic.subtopics?.flatMap((sub: any) => sub.resource_slots || []) || [];
                                      const activeSlots = allSlots.filter((slot: any) => slot.active_resource);

                                      if (activeSlots.length === 0) {
                                        return (
                                          <p className="text-xs text-slate-400 italic py-1">No learning resources added yet.</p>
                                        );
                                      }

                                      return activeSlots.map((slot: any) => (
                                        <div
                                          key={slot.id}
                                          className="flex items-center justify-between gap-2 p-1.5 px-2 rounded hover:bg-slate-100 transition-colors group"
                                        >
                                          <a
                                            href={`https://youtube.com/watch?v=${slot.active_resource.youtube_video_id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1.5 text-xs truncate flex-1"
                                            title={slot.active_resource.title || 'Watch Video'}
                                          >
                                            <Video className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                            <span className="truncate">{slot.active_resource.title || 'Watch Video'}</span>
                                          </a>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteResource(slot.id, slot.active_resource?.title)}
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete video link"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {documentSections.map(section => {
                      const sectionKey = `${subject.id}-${section.key}`;
                      const isOpen = openDocumentSections[sectionKey];
                      const documents = (subject.documents || []).filter((document: CurriculumDocument) => document.section === section.key);
                      const isUploading = uploadingDocument?.subjectId === subject.id && uploadingDocument?.section === section.key;
                      return (
                        <section key={section.key} className="border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => toggleDocumentSection(sectionKey)}
                              className="flex items-center gap-2 text-sm font-semibold text-slate-900"
                            >
                              {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                              {section.label}
                              <span className="text-xs font-normal text-slate-500">({documents.length})</span>
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadingDocument({ subjectId: subject.id, section: section.key });
                                setDocumentFile(null);
                                setDocumentTitle('');
                                setOpenDocumentSections(prev => ({ ...prev, [sectionKey]: true }));
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add PDF
                            </Button>
                          </div>
                          {isOpen && (
                            <div className="mt-3 space-y-3 pl-6">
                              {isUploading && (
                                <form onSubmit={handleDocumentUpload} className="space-y-2 rounded border border-slate-200 p-3">
                                  <div>
                                    <Label htmlFor={`pdf-${sectionKey}`}>PDF file</Label>
                                    <Input
                                      id={`pdf-${sectionKey}`}
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      required
                                      onChange={event => {
                                        const file = event.target.files?.[0] || null;
                                        setDocumentFile(file);
                                        if (file) setDocumentTitle(file.name.replace(/\.pdf$/i, ''));
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`title-${sectionKey}`}>Document title</Label>
                                    <Input
                                      id={`title-${sectionKey}`}
                                      value={documentTitle}
                                      onChange={event => setDocumentTitle(event.target.value)}
                                      maxLength={255}
                                      required
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="submit" size="sm" disabled={documentUploadBusy || !documentFile}>
                                      {documentUploadBusy ? 'Uploading...' : 'Upload PDF'}
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setUploadingDocument(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              )}
                              {documents.length === 0 && !isUploading && (
                                <p className="text-xs text-slate-400">No PDFs added yet.</p>
                              )}
                              {documents.map((document: CurriculumDocument) => (
                                <div key={document.id} className="flex items-center justify-between gap-2 text-sm">
                                  <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
                                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                    <span className="truncate">{document.title}</span>
                                  </span>
                                  <div className="flex shrink-0 gap-1">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleEditDocumentTitle(document)}>
                                      Edit title
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteDocument(document)} className="text-slate-400 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Syllabus Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Syllabus Builder</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSubjectModal(false)}>Close</Button>
            </div>
            
            <form onSubmit={handleAddSubject} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Subject Name</Label>
                  <Input 
                    placeholder="e.g. Mathematics"
                    value={newSubject.name}
                    onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input 
                    placeholder="Brief description"
                    value={newSubject.description}
                    onChange={e => setNewSubject({...newSubject, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-800">Modules & Topics</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addModule}>
                    <Plus className="w-4 h-4 mr-1" /> Add Module
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {newSubject.modules.map((mod, modIndex) => (
                    <div key={modIndex} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="mb-4">
                        <Label>Module {modIndex + 1} Name</Label>
                        <Input 
                          placeholder="e.g. Algebra Fundamentals" 
                          value={mod.name}
                          onChange={e => updateModule(modIndex, e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-3 pl-4 border-l-2 border-slate-300">
                        {mod.topics.map((top, topIndex) => (
                          <div key={topIndex} className="grid grid-cols-2 gap-3 items-end">
                            <div>
                              <Label className="text-xs text-slate-500">Topic {topIndex + 1}</Label>
                              <Input 
                                placeholder="e.g. Linear Equations" 
                                value={top.name}
                                onChange={e => updateTopic(modIndex, topIndex, 'name', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">YouTube URLs (comma separated)</Label>
                              <Input 
                                placeholder="https://..., https://..." 
                                value={top.youtubeUrls}
                                onChange={e => updateTopic(modIndex, topIndex, 'youtubeUrls', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="text-primary mt-2" onClick={() => addTopic(modIndex)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Topic
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowSubjectModal(false)}>Cancel</Button>
                <Button type="submit">Save Syllabus</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Modal */}
      {showYoutubeModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Embed YouTube Video</h3>
            <form onSubmit={handleAddYoutube} className="space-y-4">
              <div>
                <Label>YouTube URL</Label>
                <Input 
                  type="url" 
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  required 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowYoutubeModal(null)}>Cancel</Button>
                <Button type="submit">Embed Video</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
