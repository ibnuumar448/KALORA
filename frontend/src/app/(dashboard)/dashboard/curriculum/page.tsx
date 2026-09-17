"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayCircle, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { cn } from '@/components/ui/button';
import { api } from '@/lib/api';

type Curriculum = any;

export default function CurriculumPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="animate-pulse">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto h-[calc(100vh-8rem)]">
      
      {/* Video Player Section */}
      <div className="flex-1 flex flex-col gap-4">
        {activeVideo ? (
          <div className="rounded-xl overflow-hidden shadow-lg bg-black aspect-video flex-shrink-0 relative">
            <iframe 
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-100 aspect-video flex-shrink-0 flex items-center justify-center flex-col text-slate-500">
            <PlayCircle className="w-16 h-16 mb-4 text-slate-300" />
            <p>Select a topic to start learning</p>
          </div>
        )}
        
        {activeTitle && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{activeTitle}</h2>
            <p className="text-slate-500 mt-2">
              Pay close attention to this material as it will be covered in your next assessment.
            </p>
          </div>
        )}
      </div>

      {/* Curriculum Tree Sidebar */}
      <Card className="w-full lg:w-[400px] flex flex-col flex-shrink-0 h-full overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
          <CardTitle className="text-lg">Syllabus</CardTitle>
          <CardDescription>Browse and learn from curriculum</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {subjects.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-slate-500 text-center">
              <p>No curriculum available yet</p>
            </div>
          ) : (
            subjects.map(subject => (
              <div key={subject.id} className="p-4 border-b border-slate-100 last:border-b-0">
                <h3 className="font-bold text-slate-900 text-base mb-3">{subject.name}</h3>
                <div className="space-y-3 ml-2">
                  {subject.modules?.map((module: any) => (
                    <div key={module.id} className="pl-2 border-l border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-2">{module.name}</p>
                      <div className="space-y-1.5">
                        {module.topics?.map((topic: any) => (
                          <div key={topic.id}>
                            <p className="text-sm font-medium text-slate-700 mb-1">{topic.name}</p>
                            {topic.subtopics?.map((sub: any) => (
                              <div key={sub.id} className="mb-1">
                                {sub.resource_slots?.map((slot: any) => (
                                  slot.active_resource && (
                                    <button
                                      key={slot.id}
                                      onClick={() => {
                                        setActiveVideo(slot.active_resource.youtube_video_id);
                                        setActiveTitle(slot.active_resource.title || slot.name);
                                      }}
                                      className="w-full text-left flex items-start gap-2 p-1.5 rounded text-xs hover:bg-blue-50 transition-colors ml-2"
                                    >
                                      <PlayCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                                      <span className="flex-1 text-slate-600 truncate">{slot.active_resource.title || slot.name}</span>
                                    </button>
                                  )
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
