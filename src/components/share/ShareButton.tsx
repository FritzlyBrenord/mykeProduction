"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Twitter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  path?: string;
  url?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  iconOnly?: boolean;
}

type ShareChannel = "whatsapp" | "telegram" | "facebook" | "x" | "linkedin" | "email";

function absoluteUrl(path?: string, explicitUrl?: string) {
  if (explicitUrl) return explicitUrl;
  if (typeof window === "undefined") return path || "";
  if (!path || path.trim().length === 0) return window.location.href;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

function channelUrl(channel: ShareChannel, payload: { title: string; text: string; url: string }) {
  const text = payload.text?.trim() || payload.title;
  const encodedUrl = encodeURIComponent(payload.url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(payload.title);

  if (channel === "whatsapp") {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${payload.url}`)}`;
  }
  if (channel === "telegram") {
    return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  }
  if (channel === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  if (channel === "x") {
    return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  }
  if (channel === "linkedin") {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  }
  return `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${text}\n\n${payload.url}`)}`;
}

export default function ShareButton({
  title,
  text,
  path,
  url,
  label = "Partager",
  className,
  buttonClassName,
  size = "sm",
  variant = "outline",
  iconOnly = false,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const sharePayload = useMemo(() => {
    const resolvedUrl = absoluteUrl(path, url);
    return {
      title: title.trim(),
      text: (text || title || "").trim(),
      url: resolvedUrl,
    };
  }, [title, text, path, url]);

  const openFallback = () => setOpen(true);

  const handleNativeShare = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      openFallback();
      return;
    }

    const canNativeShare = typeof navigator.share === "function";
    if (!canNativeShare) {
      openFallback();
      return;
    }

    setIsSharing(true);
    try {
      await navigator.share({
        title: sharePayload.title,
        text: sharePayload.text,
        url: sharePayload.url,
      });
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === "AbortError";
      if (isAbortError) return;
      openFallback();
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sharePayload.url);
      toast.success("Lien copie.");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  };

  const handleShareChannel = (channel: ShareChannel) => {
    const destination = channelUrl(channel, sharePayload);
    window.open(destination, "_blank", "noopener,noreferrer,width=680,height=780");
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleNativeShare}
        disabled={isSharing}
        className={cn(buttonClassName)}
      >
        <Share2 className={cn("h-4 w-4", iconOnly ? "" : "mr-2")} />
        {!iconOnly && (isSharing ? "Partage..." : label)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Partager ce contenu</DialogTitle>
            <DialogDescription>
              Choisissez une application ou copiez directement le lien.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-sm font-medium text-foreground">{sharePayload.title}</p>
              <div className="flex gap-2">
                <Input readOnly value={sharePayload.url} />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={() => handleShareChannel("whatsapp")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShareChannel("telegram")}>
                <Send className="mr-2 h-4 w-4" />
                Telegram
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShareChannel("facebook")}>
                <Facebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShareChannel("x")}>
                <Twitter className="mr-2 h-4 w-4" />X
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShareChannel("linkedin")}>
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShareChannel("email")}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
