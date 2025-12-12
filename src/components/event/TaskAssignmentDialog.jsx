
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react'; // Search and UserPlus removed as per changes
import { Badge } from '@/components/ui/badge';

export default function TaskAssignmentDialog({
  isOpen,
  onOpenChange,
  members = [],
  currentAssigneeId,
  currentAssigneeName,
  onAssign,
  isLoading = false
}) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    if (!isOpen) return; // Only run effect when dialog is open

    // If there's a manual name and no ID, it's a manual assignment
    if (currentAssigneeName && !currentAssigneeId) {
      setSelectedUserId('__manual__');
      setManualName(currentAssigneeName);
    } else {
      // Otherwise, it's either a member assignment (if currentAssigneeId exists) or unassigned
      setSelectedUserId(currentAssigneeId ? String(currentAssigneeId) : '');
      setManualName(''); // Clear manual name if a member is assigned or unassigned
    }
    setSearch(''); // Always clear search on dialog open
  }, [isOpen, currentAssigneeId, currentAssigneeName]);

  const filteredMembers = (members || []).filter((m) => {
    const n = (m.name || m.full_name || m.email || '').toLowerCase();
    return n.includes((search || '').toLowerCase());
  });

  const handleAssign = () => {
    if (selectedUserId === '__manual__') {
      if (!manualName.trim()) {
        return; // Prevent assigning an empty manual name
      }
      onAssign({ type: 'manual', name: manualName.trim() });
      return;
    }
    // If selectedUserId is '', it means unassigned (null userId)
    onAssign({ type: 'member', userId: selectedUserId || null });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ direction: 'rtl' }}>
        <DialogHeader>
          <DialogTitle>שיוך משימה</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="חפש משתתף..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-right pr-3"
            />
          </div>

          {/* Members + Manual option */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
              {/* Option: ללא אחראי (Unassigned) */}
              <div className="flex items-center space-x-2 space-x-reverse p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-orange-200 transition-colors">
                <RadioGroupItem value="" id="unassigned" />
                <Label htmlFor="unassigned" className="flex-1 cursor-pointer text-gray-500 italic">
                  ללא אחראי
                </Label>
              </div>

              {/* Manual option */}
              <div className="rounded-lg border border-transparent">
                <div className="flex items-center space-x-2 space-x-reverse p-3 hover:bg-gray-50 rounded-lg cursor-pointer hover:border-orange-200 transition-colors">
                  <RadioGroupItem value="__manual__" id="manual" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer">
                    הקלד שם ידני
                  </Label>
                  {selectedUserId === '__manual__' && manualName && (
                    <Badge variant="outline" className="text-xs">{manualName}</Badge>
                  )}
                </div>
                {selectedUserId === '__manual__' && (
                  <div className="px-3 pb-3">
                    <Input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="לדוגמה: יוסי כהן"
                      className="text-right"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      השם יוצג כאחראי גם אם אינו רשום במערכת
                    </p>
                  </div>
                )}
              </div>

              {(filteredMembers || []).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center space-x-2 space-x-reverse p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-orange-200 transition-colors"
                >
                  <RadioGroupItem value={String(member.id)} id={`m-${member.id}`} />
                  <Label htmlFor={`m-${member.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {member.name || member.full_name || member.email || 'משתמש'}
                      </span>
                      {member.role && (
                        <Badge variant="outline" className="text-xs">
                          {member.role === 'organizer' ? 'מארגן' :
                            member.role === 'manager' ? 'מנהל' : 'משתתף'}
                        </Badge>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isLoading || (selectedUserId === '__manual__' && !manualName.trim())}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            שמור שיוך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
