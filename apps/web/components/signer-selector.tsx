"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  userId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl?: string | null;
  };
  title?: string | null;
}

interface SignerSelectorProps {
  members: Member[];
  selectedSigners: string[];
  onChange: (signerIds: string[]) => void;
}

export function SignerSelector({ members, selectedSigners, onChange }: SignerSelectorProps) {
  const toggleSigner = (userId: string) => {
    if (selectedSigners.includes(userId)) {
      onChange(selectedSigners.filter(id => id !== userId));
    } else {
      onChange([...selectedSigners, userId]);
    }
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50"
        >
          <Checkbox
            id={`signer-${member.userId}`}
            checked={selectedSigners.includes(member.userId)}
            onCheckedChange={() => toggleSigner(member.userId)}
          />
          <label
            htmlFor={`signer-${member.userId}`}
            className="flex items-center gap-3 flex-1 cursor-pointer"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.user.imageUrl || undefined} />
              <AvatarFallback>
                {member.user.firstName?.[0]}{member.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {member.user.firstName} {member.user.lastName}
              </p>
              {member.title && (
                <p className="text-sm text-muted-foreground">{member.title}</p>
              )}
            </div>
          </label>
        </div>
      ))}
    </div>
  );
}
