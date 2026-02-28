'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, PlayCircle, Award, Clock, ChevronRight } from 'lucide-react';
import { Enrollment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const mockEnrollments: Enrollment[] = [
  {
    id: '1',
    user_id: '1',
    formation_id: '1',
    enrolled_at: '2024-02-01',
    completed_at: null,
    progress: 65,
    formation: {
      id: '1',
      title: 'Introduction à la chimie industrielle',
      slug: 'introduction-chimie-industrielle',
      description: 'Apprenez les bases de la chimie industrielle',
      thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
      price: 199,
      is_free: false,
      format: 'video',
      status: 'published',
      category_id: '1',
      duration_hours: 12,
      level: 'debutant',
      language: 'fr',
      certificate: true,
      enrolled_count: 245,
      rating_avg: 4.7,
      created_at: '2024-01-15',
      updated_at: '2024-01-15',
    }
  },
  {
    id: '2',
    user_id: '1',
    formation_id: '2',
    enrolled_at: '2024-01-15',
    completed_at: '2024-02-10',
    progress: 100,
    formation: {
      id: '2',
      title: 'Sécurité des procédés industriels',
      slug: 'securite-procedes-industriels',
      description: 'Maîtrisez les normes de sécurité',
      thumbnail_url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a782?w=800',
      price: 0,
      is_free: true,
      format: 'text',
      status: 'published',
      category_id: '2',
      duration_hours: 8,
      level: 'intermediaire',
      language: 'fr',
      certificate: true,
      enrolled_count: 512,
      rating_avg: 4.5,
      created_at: '2024-02-01',
      updated_at: '2024-02-01',
    }
  },
];

export default function MyFormationsPage() {
  const inProgress = mockEnrollments.filter(e => e.progress < 100);
  const completed = mockEnrollments.filter(e => e.progress === 100);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes formations</h1>
          <p className="text-slate-600 mb-8">
            Gérez vos formations et suivez votre progression
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{mockEnrollments.length}</p>
                <p className="text-sm text-slate-500">Formations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <PlayCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{inProgress.length}</p>
                <p className="text-sm text-slate-500">En cours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{completed.length}</p>
                <p className="text-sm text-slate-500">Terminées</p>
              </CardContent>
            </Card>
          </div>

          {/* In Progress */}
          {inProgress.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                En cours ({inProgress.length})
              </h2>
              <div className="space-y-4">
                {inProgress.map((enrollment) => (
                  <Card key={enrollment.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full sm:w-48 h-32 sm:h-auto">
                          <img
                            src={enrollment.formation?.thumbnail_url}
                            alt={enrollment.formation?.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-lg text-slate-900 mb-1">
                                {enrollment.formation?.title}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {enrollment.formation?.duration_hours}h
                                </span>
                                <Badge variant="secondary">
                                  {enrollment.progress}% complété
                                </Badge>
                              </div>
                              <Progress value={enrollment.progress} className="w-full sm:w-64 h-2" />
                            </div>
                            <Link href={`/formations/${enrollment.formation?.slug}/apprendre`}>
                              <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Continuer
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Terminées ({completed.length})
              </h2>
              <div className="space-y-4">
                {completed.map((enrollment) => (
                  <Card key={enrollment.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full sm:w-48 h-32 sm:h-auto">
                          <img
                            src={enrollment.formation?.thumbnail_url}
                            alt={enrollment.formation?.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-lg text-slate-900 mb-1">
                                {enrollment.formation?.title}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {enrollment.formation?.duration_hours}h
                                </span>
                                <Badge className="bg-green-500">
                                  <Award className="h-3 w-3 mr-1" />
                                  Certifié
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500">
                                Terminée le {new Date(enrollment.completed_at || '').toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline">
                                <Award className="h-4 w-4 mr-2" />
                                Certificat
                              </Button>
                              <Link href={`/formations/${enrollment.formation?.slug}/apprendre`}>
                                <Button variant="ghost">
                                  Revoir
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
