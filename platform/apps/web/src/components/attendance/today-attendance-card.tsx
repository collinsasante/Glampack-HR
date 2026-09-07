"use client";

import { CheckCircle2, LogIn, LogOut as LogOutIcon, MapPin, MapPinOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { checkIn, checkOut, listAttendance, type AttendanceRecord } from "@/lib/api/attendance";
import { listOffices, type Office } from "@/lib/api/offices";
import { useAuth } from "@/lib/auth-context";
import type { Shift } from "@glampack/shared";

const SHIFT_OPTIONS: { value: Shift; label: string }[] = [
  { value: "MorningProductionDay", label: "Morning Production (Day)" },
  { value: "NightProduction", label: "Night Production" },
  { value: "StraightShift", label: "Straight Shift" },
  { value: "HybridMorning", label: "Hybrid Morning" },
  { value: "HybridAfternoon", label: "Hybrid Afternoon" },
  { value: "SaturdayShift", label: "Saturday Shift" },
];

// Per-shift late-arrival cutoff (24h "HH:MM"), matching the original app's shift
// schedule: each shift's start time plus a 30-minute grace period.
const SHIFT_LATE_THRESHOLDS: Record<Shift, string> = {
  MorningProductionDay: "08:30",
  NightProduction: "20:30",
  StraightShift: "08:30",
  HybridMorning: "07:30",
  HybridAfternoon: "14:30",
  SaturdayShift: "09:30",
};

// Night Production starts at 8pm — a check-in in the early morning is the tail end
// of the previous night's shift finishing up, not a late start, so it's never flagged.
function isLateForShift(shift: Shift, now: Date): boolean {
  if (shift === "NightProduction" && now.getHours() < 20) return false;
  const [thresholdHour, thresholdMinute] = SHIFT_LATE_THRESHOLDS[shift].split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > thresholdHour * 60 + thresholdMinute;
}

function formatThreshold(shift: Shift): string {
  const [hour, minute] = SHIFT_LATE_THRESHOLDS[shift].split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Real elapsed time between two instants, formatted HH:MM:SS — used for both the
// live-ticking in-progress timer and the frozen final duration after checkout.
function formatElapsed(startIso: string, endIso: string) {
  const ms = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s, label: `${h}h ${m}m`, clock: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

// Distance-from-office is informational only (never enforced, matches the old
// app's "logging purposes" geofence) — shown here for transparency, not as a
// pass/fail indicator. Coordinates themselves are never surfaced in the UI.
function locationSummary(record: AttendanceRecord, which: "checkIn" | "checkOut") {
  const city = which === "checkIn" ? record.checkInCity : record.checkOutCity;
  const region = which === "checkIn" ? record.checkInRegion : record.checkOutRegion;
  const office = which === "checkIn" ? record.checkInOffice : record.checkOutOffice;
  const distance = which === "checkIn" ? record.checkInDistanceFromOfficeM : record.checkOutDistanceFromOfficeM;
  if (!city && !distance) return null;
  const place = [city, region].filter(Boolean).join(", ");
  const distanceLabel = distance
    ? `${Number(distance).toFixed(0)}m from ${office?.name ?? "office"}`
    : null;
  return [place, distanceLabel].filter(Boolean).join(" · ");
}

// Shared between /dashboard and /attendance so check-in/out logic and its
// loading/error/location states aren't duplicated across pages.
export function TodayAttendanceCard({ onChange }: { onChange?: () => void }) {
  const { employee } = useAuth();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<Shift>("MorningProductionDay");
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "locating" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [locationFailed, setLocationFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [lateReasonOpen, setLateReasonOpen] = useState(false);
  const [lateReasonText, setLateReasonText] = useState("");

  async function refresh() {
    if (!employee) return;
    setLoading(true);
    try {
      const [attendance, officeList] = await Promise.all([
        listAttendance({ employeeId: employee.id }),
        listOffices(),
      ]);
      const todayStr = new Date().toISOString().slice(0, 10);
      setToday(attendance.find((a) => a.date.slice(0, 10) === todayStr) ?? null);
      setOffices(officeList);
      setOfficeId((current) => current || officeList[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  // Real ticking timer while checked in — freezes the instant checkOutTime is set.
  useEffect(() => {
    if (!today?.checkInTime || today.checkOutTime) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [today?.checkInTime, today?.checkOutTime]);

  function getPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function handleCheckIn() {
    if (isLateForShift(shift, new Date())) {
      setLateReasonText("");
      setLateReasonOpen(true);
      return;
    }
    performCheckIn();
  }

  async function performCheckIn(lateReason?: string) {
    setMessage(null);
    setLocationFailed(false);
    setPhase("locating");
    const position = await getPosition();
    if (!position) setLocationFailed(true);
    setPhase("saving");
    try {
      await checkIn({
        shift,
        position: position ? { lat: position.coords.latitude, lng: position.coords.longitude } : undefined,
        officeId: officeId || undefined,
        lateReason,
      });
      setMessage("Checked in successfully.");
      await refresh();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Check-in failed. Please try again.");
    } finally {
      setPhase("idle");
    }
  }

  function handleLateReasonSubmit(e: FormEvent) {
    e.preventDefault();
    const reason = lateReasonText.trim();
    setLateReasonOpen(false);
    performCheckIn(reason);
  }

  async function handleCheckOut() {
    setMessage(null);
    setLocationFailed(false);
    setPhase("locating");
    const position = await getPosition();
    if (!position) setLocationFailed(true);
    setPhase("saving");
    try {
      await checkOut({
        position: position ? { lat: position.coords.latitude, lng: position.coords.longitude } : undefined,
        officeId: officeId || undefined,
      });
      setMessage("Checked out successfully.");
      await refresh();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Check-out failed. Please try again.");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  const status = today?.checkOutTime ? "Completed" : today?.checkInTime ? "Working" : "Not checked in";
  const statusVariant = status === "Completed" ? "success" : status === "Working" ? "warning" : "secondary";
  const elapsed = today?.checkInTime
    ? formatElapsed(today.checkInTime, today.checkOutTime ?? now.toISOString())
    : null;
  const locationText = today && locationSummary(today, today.checkOutTime ? "checkOut" : "checkIn");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
        {!loading && (
          <Badge variant={statusVariant}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === "Working" ? "bg-amber-600" : status === "Completed" ? "bg-emerald-600" : "bg-muted-foreground"}`} />
            {status}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {today?.checkInTime ? formatTime(today.checkInTime) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {today?.checkOutTime ? formatTime(today.checkOutTime) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {today?.checkOutTime ? "Total working time" : "Working time"}
                </p>
                <p className="mt-0.5 font-semibold text-foreground tabular-nums">
                  {elapsed ? (today?.checkOutTime ? elapsed.label : elapsed.clock) : "—"}
                </p>
              </div>
            </div>

            {today?.checkInTime && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                {locationText ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Location verified · {locationText}
                  </>
                ) : (
                  <>
                    <MapPinOff className="h-3.5 w-3.5" /> Location not recorded
                  </>
                )}
              </p>
            )}

            {today && today.checkInTime && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                <li className="flex items-center gap-2.5 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="font-medium text-foreground">{formatTime(today.checkInTime)}</span>
                  <span className="text-muted-foreground">Check In</span>
                </li>
                {today.checkOutTime && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                    <span className="font-medium text-foreground">{formatTime(today.checkOutTime)}</span>
                    <span className="text-muted-foreground">Check Out</span>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-4 border-t border-border pt-4">
              {!today?.checkInTime ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={shift} onValueChange={(v) => setShift(v as Shift)} disabled={busy}>
                    <SelectTrigger className="w-64">
                      <SelectValue>{SHIFT_OPTIONS.find((o) => o.value === shift)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {offices.length > 0 && (
                    <Select value={officeId} onValueChange={(v) => setOfficeId(v ?? "")} disabled={busy}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Which office?">
                          {offices.find((o) => o.id === officeId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {offices.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    onClick={handleCheckIn}
                    disabled={busy || (offices.length > 0 && !officeId)}
                    aria-label="Check in for today"
                  >
                    <LogIn className="h-4 w-4" />
                    {phase === "locating" ? "Detecting location…" : phase === "saving" ? "Checking in…" : "Check In"}
                  </Button>
                </div>
              ) : !today?.checkOutTime ? (
                <div className="flex flex-wrap items-center gap-3">
                  {offices.length > 0 && (
                    <Select value={officeId} onValueChange={(v) => setOfficeId(v ?? "")} disabled={busy}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Which office?">
                          {offices.find((o) => o.id === officeId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {offices.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    onClick={handleCheckOut}
                    disabled={busy || (offices.length > 0 && !officeId)}
                    aria-label="Check out for today"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    {phase === "locating" ? "Detecting location…" : phase === "saving" ? "Checking out…" : "Check Out"}
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Attendance completed for today.
                </p>
              )}
              {locationFailed && phase === "idle" && !message && (
                <p className="mt-3 text-xs text-muted-foreground">
                  We couldn&apos;t detect your location — this won&apos;t stop your check-in from being recorded.
                </p>
              )}
              {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={lateReasonOpen} onOpenChange={setLateReasonOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleLateReasonSubmit}>
            <DialogHeader>
              <DialogTitle>Late Check-In</DialogTitle>
              <DialogDescription>
                You are checking in after {formatThreshold(shift)}. Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              className="mt-4"
              value={lateReasonText}
              onChange={(e) => setLateReasonText(e.target.value)}
              placeholder="Why are you checking in late?"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setLateReasonOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Check In</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
