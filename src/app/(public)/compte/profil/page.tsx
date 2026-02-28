'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    country: '',
    bio: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulation
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Profil mis à jour avec succès');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Mon profil</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avatar Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-4xl">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
                <h2 className="font-semibold text-lg text-slate-900">
                  {user?.full_name || 'Utilisateur'}
                </h2>
                <p className="text-slate-500">{user?.email}</p>
                <p className="text-sm text-slate-400 mt-2">
                  Membre depuis {new Date(user?.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-10"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="country">Pays</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full h-10 pl-10 rounded-md border border-input bg-background"
                        >
                          <option value="">Sélectionner</option>
                          <option value="FR">France</option>
                          <option value="BE">Belgique</option>
                          <option value="CH">Suisse</option>
                          <option value="DE">Allemagne</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Parlez-nous de vous..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
