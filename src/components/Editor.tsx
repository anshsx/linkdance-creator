import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  LinkItem as LinkItemType, 
  ProfileData, 
  getProfileById, 
  saveProfile, 
  createDemoProfile 
} from '@/utils/storage';
import { generatePublishUrl } from '@/utils/publish';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Save, Link as LinkIcon, Globe, Plus, Wand2, Copy, ExternalLink
} from 'lucide-react';
import PhoneMockup from './PhoneMockup';
import LinkItem from './LinkItem';
import SocialLinks from './SocialLinks';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import AppHeader from './AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<ProfileData>({
    id: id || '',
    name: '',
    description: '',
    photoUrl: '',
    links: [],
    socialLinks: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [showUrlPopover, setShowUrlPopover] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    if (id) {
      const existingProfile = getProfileById(id);
      if (existingProfile) {
        setProfile(existingProfile);
      }
    }
  }, [id]);

  const debouncedSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      saveProfile(profile);
      toast.success('Changes auto-saved');
    }, 800);
    
    setAutoSaveTimer(timer);
  }, [profile, autoSaveTimer]);

  useEffect(() => {
    if (profile.name || profile.links.length > 0) {
      debouncedSave();
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [profile, debouncedSave, autoSaveTimer]);

  const handleProfileChange = (key: keyof ProfileData, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleAddLink = () => {
    const newLink: LinkItemType = {
      id: uuidv4(),
      label: '',
      url: '',
      icon: ''
    };
    
    setProfile(prev => ({
      ...prev,
      links: [...prev.links, newLink]
    }));
  };

  const handleUpdateLink = (id: string, updates: Partial<LinkItemType>) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.map(link => 
        link.id === id ? { ...link, ...updates } : link
      )
    }));
  };

  const handleDeleteLink = (id: string) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.filter(link => link.id !== id)
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(profile.links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setProfile(prev => ({ ...prev, links: items }));
  };

  const handleUpdateSocialLinks = (links: any[]) => {
    setProfile(prev => ({ ...prev, socialLinks: links }));
  };

  const handleLoadDemo = () => {
    const demoProfile = createDemoProfile();
    demoProfile.id = profile.id;
    setProfile(demoProfile);
    toast.success('Demo data loaded');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
    setShowUrlPopover(false);
  };

  const handlePublish = async () => {
    if (!profile.name) {
      toast.error('Please add a name before publishing');
      return;
    }
    
    try {
      setIsPublishing(true);
      const publishedUrl = await generatePublishUrl(profile);
      
      setProfile(prev => ({ 
        ...prev, 
        publishedUrl 
      }));
      
      saveProfile({
        ...profile,
        publishedUrl
      });
      
      setShowUrlPopover(true);
      toast.success('Your page has been published!');
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveAndExit = () => {
    saveProfile(profile);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <header className="border-b sticky top-14 bg-background/80 backdrop-blur-sm z-10">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSaveAndExit}
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Edit Profile</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowMobilePreview(!showMobilePreview)}
                className="gap-1"
              >
                {showMobilePreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleLoadDemo}
              className="gap-1"
            >
              <Wand2 size={16} /> Demo Data
            </Button>
            
            {profile.publishedUrl ? (
              <Popover open={showUrlPopover} onOpenChange={setShowUrlPopover}>
                <PopoverTrigger asChild>
                  <Button className="gap-1">
                    <Copy size={16} /> Copy Link
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h3 className="font-medium">Your published URL</h3>
                    <div className="flex items-center gap-2">
                      <Input value={profile.publishedUrl} readOnly />
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => copyToClipboard(profile.publishedUrl || '')}
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                    <div className="flex justify-between pt-2">
                      <a
                        href={profile.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Open in new tab
                      </a>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => setShowUrlPopover(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button 
                onClick={handlePublish}
                disabled={isPublishing}
                className="gap-1"
              >
                <Globe size={16} /> 
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
          </div>
        </div>
      </header>
      
      {isMobile && showMobilePreview && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex justify-center">
            <PhoneMockup profile={profile} />
          </div>
        </div>
      )}
      
      <main className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Profile Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    placeholder="Your name or title"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">About</label>
                  <Textarea 
                    value={profile.description}
                    onChange={(e) => handleProfileChange('description', e.target.value)}
                    placeholder="Write a short bio or description"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Photo URL</label>
                  <Input 
                    value={profile.photoUrl}
                    onChange={(e) => handleProfileChange('photoUrl', e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Links</h2>
              <p className="text-sm text-muted-foreground">Add and arrange your links. Drag to reorder.</p>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="links">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {profile.links.map((link, index) => (
                        <Draggable key={link.id} draggableId={link.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <LinkItem
                                link={link}
                                onUpdate={handleUpdateLink}
                                onDelete={handleDeleteLink}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={handleAddLink}
              >
                <Plus size={18} className="mr-2" /> Add Link
              </Button>
            </div>
            
            <SocialLinks 
              socialLinks={profile.socialLinks}
              updateSocialLinks={handleUpdateSocialLinks}
            />
          </div>
          
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Preview</h2>
              <div className="flex justify-center">
                <PhoneMockup profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;
