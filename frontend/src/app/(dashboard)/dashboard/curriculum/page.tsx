"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayCircle, CheckCircle, Target, BookOpen, ExternalLink, Activity, Info, Users, ChevronDown, ChevronUp, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Curriculum = any;
type CurriculumDocumentSection = 'textbooks' | 'jamb_past_questions';
type CurriculumDocument = {
  id: string;
  section: CurriculumDocumentSection;
  title: string;
  original_filename: string;
};
type CurriculumSubject = {
  id: string;
  name: string;
  documents?: CurriculumDocument[];
};

const getErrorDetail = (error: unknown) => {
  if (!axios.isAxiosError(error)) return undefined;
  const detail: unknown = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : undefined;
};

export default function CurriculumPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track selected context instead of just a video
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [activeSlot, setActiveSlot] = useState<any>(null);
  const [activeResource, setActiveResource] = useState<any>(null);
  const [selectedDocumentSection, setSelectedDocumentSection] = useState<{ subject: CurriculumSubject; section: CurriculumDocumentSection } | null>(null);
  const [activeDocument, setActiveDocument] = useState<CurriculumDocument | null>(null);
  const [activeDocumentUrl, setActiveDocumentUrl] = useState<string | null>(null);
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
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
    fetchCurriculum();
  }, []);

  useEffect(() => {
    return () => {
      if (activeDocumentUrl) URL.revokeObjectURL(activeDocumentUrl);
    };
  }, [activeDocumentUrl]);

  const handleDocumentAction = async (document: CurriculumDocument, download: boolean) => {
    setDocumentBusyId(document.id);
    try {
      const response = await api.get(`/curriculum/documents/${document.id}/file`, {
        params: download ? { download: true } : undefined,
        responseType: 'blob'
      });
      const fileUrl = URL.createObjectURL(response.data);
      if (download) {
        const link = window.document.createElement('a');
        link.href = fileUrl;
        link.download = document.original_filename || `${document.title}.pdf`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      } else {
        setActiveDocument(document);
        setActiveDocumentUrl(fileUrl);
      }
    } catch (error: unknown) {
      toast.error(getErrorDetail(error) || 'Unable to open this PDF');
    } finally {
      setDocumentBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="animate-pulse">Loading structured curriculum...</p>
        </div>
      </div>
    );
  }

  const renderActiveContent = () => {
    if (selectedDocumentSection) {
      const { subject, section } = selectedDocumentSection;
      const label = section === 'textbooks' ? 'Recommended Textbooks' : 'JAMB Past Questions';
      const documents = (subject.documents || []).filter((document: CurriculumDocument) => document.section === section);
      return (
        <div className="flex-1 flex flex-col overflow-y-auto pr-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-bold text-slate-900">{subject.name}</h2>
            <h3 className="mt-1 text-lg font-semibold text-slate-700">{label}</h3>
            {documents.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">No PDFs are available in this section yet.</p>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {documents.map((document: CurriculumDocument) => (
                  <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-slate-800">{document.title}</span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={documentBusyId === document.id}
                        onClick={() => handleDocumentAction(document, false)}
                      >
                        Read
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={documentBusyId === document.id}
                        onClick={() => handleDocumentAction(document, true)}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          {activeDocumentUrl && activeDocument && selectedDocumentSection.subject.id === subject.id && (
            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-slate-900">{activeDocument.title}</h3>
              <iframe
                src={activeDocumentUrl}
                title={activeDocument.title}
                className="h-[70vh] w-full rounded border border-slate-200"
              />
            </section>
          )}
        </div>
      );
    }

    if (!activeTopic) {
      return (
        <div className="flex-1 flex items-center justify-center border border-slate-200 bg-white rounded-xl">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to KALORA Learning</h2>
            <p className="text-slate-500 text-sm">
              Select a topic from the syllabus sidebar to access structured learning resources, practice materials, and assessments.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-y-auto pr-2">
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
            <BookOpen className="w-4 h-4" />
            <span>LEARN</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{activeTopic.name}</h2>
          <p className="text-slate-600 text-sm mb-6">Review the curated external learning resources below to build your foundational understanding of this topic.</p>
          
          {activeResource && activeResource.youtube_video_id ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">{activeResource.title || activeSlot?.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>External Learning Resource (YouTube)</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://youtube.com/watch?v=${activeResource.youtube_video_id}`, '_blank')}>
                  Watch on YouTube
                </Button>
              </div>
              <div className="rounded-lg overflow-hidden shadow bg-black aspect-video relative">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${activeResource.youtube_video_id}?rel=0`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Select a specific resource from the sidebar to view it here.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto h-[calc(100vh-8rem)]">
      
      {/* Video / Content Section */}
      {renderActiveContent()}

      {/* Curriculum Tree Sidebar */}
      <Card className="w-full lg:w-[400px] flex flex-col flex-shrink-0 h-full overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
          <CardTitle className="text-lg text-slate-900">Syllabus</CardTitle>
          <CardDescription>Structured learning path</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {subjects.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-slate-500 text-center">
              <p>No curriculum available yet</p>
            </div>
          ) : (
            subjects.map(subject => (
              <div key={subject.id} className="p-4 border-b border-slate-100 last:border-b-0">
                <button 
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full text-left flex items-center justify-between mb-3 hover:opacity-80 transition-opacity focus:outline-none"
                >
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    {subject.name}
                  </h3>
                  {expandedSubjects[subject.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                
                {expandedSubjects[subject.id] && (
                  <div className="space-y-4 ml-3">
                    <h4 className="text-sm font-semibold text-slate-800">Core Syllabus</h4>
                    {subject.modules?.map((module: any) => (
                      <div key={module.id} className="pl-3 border-l-2 border-slate-100">
                        {module.name !== 'Core Syllabus' && (
                          <p className="text-xs text-slate-500 tracking-wider uppercase font-bold mb-3">{module.name}</p>
                        )}
                        <div className="space-y-3">
                          {module.topics?.map((topic: any) => (
                            <div key={topic.id} className="mb-2">
                              <button 
                                onClick={() => {
                                  setSelectedDocumentSection(null);
                                  setActiveDocument(null);
                                  setActiveDocumentUrl(null);
                                  setActiveTopic(topic);
                                  setActiveResource(null);
                                }}
                                className="w-full text-left font-semibold text-sm text-slate-800 hover:text-primary transition-colors mb-2"
                              >
                                {topic.name}
                              </button>
                              {(() => {
                                const allSlots = topic.subtopics?.flatMap((sub: any) => sub.resource_slots || []) || [];
                                const activeSlots = allSlots.filter((slot: any) => slot.active_resource);

                                if (activeSlots.length === 0) {
                                  return (
                                    <p className="text-xs text-slate-400 italic pl-3 py-0.5">No learning resources added yet.</p>
                                  );
                                }

                                return (
                                  <div className="space-y-1 pl-1 mb-2">
                                    {activeSlots.map((slot: any) => (
                                      <button
                                        key={slot.id}
                                        onClick={() => {
                                          setSelectedDocumentSection(null);
                                          setActiveDocument(null);
                                          setActiveDocumentUrl(null);
                                          setActiveTopic(topic);
                                          setActiveSlot(slot);
                                          setActiveResource(slot.active_resource);
                                        }}
                                        className={`w-full text-left flex items-start gap-2 p-2 rounded-md text-xs transition-colors ${activeResource?.id === slot.active_resource.id ? 'bg-primary-light text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        <span className="flex-1 truncate">{slot.active_resource.title || slot.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {([
                      { key: 'textbooks', label: 'Recommended Textbooks' },
                      { key: 'jamb_past_questions', label: 'JAMB Past Questions' },
                    ] as { key: CurriculumDocumentSection; label: string }[]).map(section => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => {
                          setSelectedDocumentSection({ subject, section: section.key });
                          setActiveTopic(null);
                          setActiveSlot(null);
                          setActiveResource(null);
                          setActiveDocument(null);
                          setActiveDocumentUrl(null);
                        }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 pt-3 text-left text-sm font-semibold text-slate-800 hover:text-primary"
                      >
                        <FileText className="h-4 w-4 text-slate-400" />
                        {section.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
