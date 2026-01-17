"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Signature {
  id: string;
  status: "PENDING" | "SIGNED" | "DECLINED";
  signedAt: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl?: string | null;
  };
}

interface SigningStatusProps {
  signatures: Signature[];
}

export function SigningStatus({ signatures }: SigningStatusProps) {
  const signedCount = signatures.filter(s => s.status === "SIGNED").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Signatures ({signedCount} of {signatures.length} complete)
      </p>
      <div className="space-y-2">
        {signatures.map((sig) => (
          <div key={sig.id} className="flex items-center gap-3">
            {sig.status === "SIGNED" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="Signed" />
            ) : sig.status === "DECLINED" ? (
              <XCircle className="h-5 w-5 text-red-600" aria-label="Declined" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600" aria-label="Pending signature" />
            )}
            <Avatar className="h-6 w-6">
              <AvatarImage src={sig.user.imageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {sig.user.firstName?.[0]}{sig.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">
              {`${sig.user.firstName || ""} ${sig.user.lastName || ""}`.trim() || "Unknown User"}
            </span>
            {sig.status === "SIGNED" && sig.signedAt && (
              <span className="text-sm text-muted-foreground">
                - Signed {(() => {
                  try {
                    return format(new Date(sig.signedAt), "MMM d, yyyy");
                  } catch {
                    return "date unknown";
                  }
                })()}
              </span>
            )}
            {sig.status === "PENDING" && (
              <span className="text-sm text-muted-foreground">- Pending</span>
            )}
            {sig.status === "DECLINED" && (
              <span className="text-sm text-muted-foreground">- Declined</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
