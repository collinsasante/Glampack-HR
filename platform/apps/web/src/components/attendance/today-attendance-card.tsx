"use client";

import { CheckCircle2, LogIn, LogOut as LogOutIcon, MapPin, MapPinOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { checkIn, checkOut, listAttendance, type AttendanceRecord } from "@/lib/api/attendance";
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
  const distance = which === "checkIn" ? record.checkInDistanceFromOfficeM : record.checkOutDistanceFromOfficeM;
  if (!city && !distance) return null;
  const place = [city, region].filter(Boolean).join(", ");
  const distanceLabel = distance ? `${Number(distance).toFixed(0)}m from office` : null;
  return [place, distanceLabel].filter(Boolean).join(" · ");
}

// Shared between /dashboard and /attendance so check-in/out logic and its
// loading/error/location states aren't duplicated across pages.
export function TodayAttendanceCard({ onChange }: { onChange?: () => void }) {
  const { employee } = useAuth();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<Shift>("MorningProductionDay");
  const [phase, setPhase] = useState<"idle" | "locating" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [locationFailed, setLocationFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  async function refresh() {
    if (!employee) return;
    setLoading(true);
    try {
      const attendance = await listAttendance({ employeeId: employee.id });
      const todayStr = new Date().toISOString().slice(0, 10);
      setToday(attendance.find((a) => a.date.slice(0, 10) === todayStr) ?? null);
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

  async function handleCheckIn() {
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
                  <Button onClick={handleCheckIn} disabled={busy} aria-label="Check in for today">
                    <LogIn className="h-4 w-4" />
                    {phase === "locating" ? "Detecting location…" : phase === "saving" ? "Checking in…" : "Check In"}
                  </Button>
                </div>
              ) : !today?.checkOutTime ? (
                <Button onClick={handleCheckOut} disabled={busy} aria-label="Check out for today">
                  <LogOutIcon className="h-4 w-4" />
                  {phase === "locating" ? "Detecting location…" : phase === "saving" ? "Checking out…" : "Check Out"}
                </Button>
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
    </Card>
  );
}
