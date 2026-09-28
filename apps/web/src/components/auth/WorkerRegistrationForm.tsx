"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/auth/OtpInput";
import FileUpload from "@/components/ui/FileUpload";
import { useToast } from "@/components/providers/ToastProvider";
import { Check, Loader2, Shield, FileCheck, MapPin, User, Briefcase, Upload, Send } from "lucide-react";
import { apiPost, apiUpload } from "@/lib/api";

interface WorkerRegistrationFormProps {
  user: { id: string; name: string; phone: string; email?: string };
}

const SKILL_OPTIONS = [
  "Plumbing", "Electrical", "Cleaning", "Transport", "Carpentry",
  "Painting", "AC Repair", "Home Security", "Masonry", "Tailoring",
  "Cooking", "Tutoring",
];

const STEPS = [
  { num: 1, label: "Phone OTP", icon: Send },
  { num: 2, label: "Personal", icon: User },
  { num: 3, label: "Skills", icon: Briefcase },
  { num: 4, label: "Location", icon: MapPin },
  { num: 5, label: "Documents", icon: Upload },
  { num: 6, label: "Aadhaar Scan", icon: Shield },
  { num: 7, label: "Aadhaar OTP", icon: FileCheck },
  { num: 8, label: "Submit", icon: Check },
];

export function WorkerRegistrationForm({ user }: WorkerRegistrationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // Step 2: Personal
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);

  // Step 3: Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Step 4: Location
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [workAddress, setWorkAddress] = useState("");

  // Step 5: Documents
  const [fileName, setFileName] = useState("");
  const [kycDocumentUrl, setKycDocumentUrl] = useState("");

  // Step 6: Aadhaar Scan (Secure QR)
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarMobile, setAadhaarMobile] = useState(user.phone);
  const [qrVerified, setQrVerified] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Step 7: Aadhaar OTP
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarOtpVerified, setAadhaarOtpVerified] = useState(false);
  const [aadhaarOtpLoading, setAadhaarOtpLoading] = useState(false);

  const maskedAadhaar = aadhaarNumber ? `XXXX XXXX ${aadhaarNumber.slice(-4)}` : "";

  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await apiPost<any>("/auth/send-otp", { phone: user.phone });
      if (res.success) {
        setOtpSent(true);
        toast({ title: "OTP sent to your phone", variant: "success" });
      } else {
        toast({ title: res.error || "Failed to send OTP", variant: "danger" });
      }
    } catch {
      toast({ title: "Failed to send OTP", variant: "danger" });
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    try {
      const res = await apiPost<any>("/auth/verify-otp", { phone: user.phone, otp });
      if (res.success) {
        setOtpVerified(true);
        toast({ title: "Phone verified!", variant: "success" });
        setTimeout(() => setStep(2), 1000);
      } else {
        toast({ title: res.error || "Invalid OTP", variant: "danger" });
      }
    } catch {
      toast({ title: "OTP verification failed", variant: "danger" });
    }
  };

  const uploadAadhaarQr = async (file: File) => {
    setQrLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiUpload<any>("/verification/aadhaar-qr", form);
      if (res.success && res.data.verified) {
        setQrVerified(true);
        setQrData(res.data);
        toast({ title: "Aadhaar Secure QR verified!", variant: "success" });
      } else {
        toast({ title: res.error || "QR verification failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not read Aadhaar QR. Try a clearer photo.", variant: "danger" });
    } finally {
      setQrLoading(false);
    }
  };

  const sendAadhaarOtp = async () => {
    setAadhaarOtpLoading(true);
    try {
      const res = await apiPost<any>("/verification/aadhaar-otp/send", {
        aadhaarNumber,
        mobile: aadhaarMobile,
      });
      if (res.success) {
        setAadhaarOtpSent(true);
        toast({
          title: "Aadhaar OTP Generated",
          description: res.data?.otp ? `Demo Code: ${res.data.otp}` : "OTP sent to your Aadhaar-linked mobile",
          variant: "success",
        });
      } else {
        toast({ title: res.error || "Failed to send OTP", variant: "danger" });
      }
    } catch {
      toast({ title: "Failed to send Aadhaar OTP", variant: "danger" });
    } finally {
      setAadhaarOtpLoading(false);
    }
  };

  const verifyAadhaarOtp = async (otp: string) => {
    setAadhaarOtpLoading(true);
    try {
      const res = await apiPost<any>("/verification/aadhaar-otp", {
        aadhaarNumber,
        mobile: aadhaarMobile,
        otp,
      });
      if (res.success && res.data.verified) {
        setAadhaarOtpVerified(true);
        toast({ title: "Aadhaar OTP verified!", variant: "success" });
      } else {
        toast({ title: res.error || "Invalid OTP", variant: "danger" });
      }
    } catch {
      toast({ title: "Aadhaar OTP verification failed", variant: "danger" });
    } finally {
      setAadhaarOtpLoading(false);
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      const res = await apiPost<any>("/workers/register", {
        skillTags: selectedSkills,
        bio: bio || undefined,
        experienceYears,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        workAddress: workAddress || undefined,
        aadhaarNumber,
        aadhaarName: qrData?.name,
        aadhaarDob: qrData?.dob || qrData?.yob,
        kycDocumentUrl: kycDocumentUrl || undefined,
        digilockerRef: qrData?.digilockerRef,
      });
      if (res.success) {
        toast({ title: "Profile created — you're live!", variant: "success" });
        router.push("/worker/dashboard");
      } else {
        toast({ title: res.error || "Registration failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Registration failed. Please try again.", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return otpVerified;
      case 2: return name.length >= 2;
      case 3: return selectedSkills.length > 0;
      case 4: return workAddress.length >= 5;
      case 5: return kycDocumentUrl.length > 0;
      case 6: return qrVerified;
      case 7: return aadhaarOtpVerified;
      case 8: return true;
      default: return false;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8 flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center shrink-0">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step > s.num ? "bg-green-500 text-white" :
              step === s.num ? "bg-indigo-600 text-white ring-2 ring-indigo-300" :
              "bg-gray-200 text-gray-500"
            }`}>
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 mx-1 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step - 1].label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1: Phone OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Verify your phone number <span className="font-medium text-gray-900">{user.phone}</span>
              </p>
              {!otpSent ? (
                <Button onClick={sendOtp} disabled={otpSending} className="w-full">
                  {otpSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send OTP
                </Button>
              ) : !otpVerified ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your phone</p>
                  <OtpInput length={6} onComplete={verifyOtp} />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Phone verified!</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div className="space-y-4">
              <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Bio / About You</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your work experience..."
                />
              </div>
              <Input
                label="Years of Experience"
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Step 3: Skills */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select at least one skill you specialize in</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "info" : "default"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleSkill(skill)}
                  >
                    {selectedSkills.includes(skill) && <Check className="mr-1 h-3 w-3" />}
                    {skill}
                  </Badge>
                ))}
              </div>
              {selectedSkills.length > 0 && (
                <p className="text-xs text-green-600">{selectedSkills.length} skill(s) selected</p>
              )}
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div className="space-y-4">
              <Input label="Work Address" value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} placeholder="e.g. MG Road, Pune, Maharashtra" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 18.5204" />
                <Input label="Longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 73.8567" />
              </div>
              <Button variant="outline" type="button" onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setLatitude(pos.coords.latitude.toFixed(4));
                    setLongitude(pos.coords.longitude.toFixed(4));
                    toast({ title: "Location detected", variant: "success" });
                  });
                }
              }}>
                <MapPin className="mr-2 h-4 w-4" /> Use Current Location
              </Button>
            </div>
          )}

          {/* Step 5: Documents */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Upload your Aadhaar card or government-issued ID — this is required for KYC.</p>
              <FileUpload
                endpoint="/uploads/kyc"
                label="Aadhaar Card / Government ID"
                description="PDF, JPG or PNG (max 5MB) — uploaded securely to our document store"
                onUploadComplete={(data) => {
                  setKycDocumentUrl(data.url);
                  setFileName(data.url.split("/").pop() || "document");
                  toast({ title: "Document uploaded", variant: "success" });
                }}
              />
              {kycDocumentUrl && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                  <FileCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700">Document uploaded for KYC review</span>
                </div>
              )}
            </div>
          )}

          {/* Step 6: DigiLocker */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800 font-medium">Aadhaar Secure QR Verification</p>
                <p className="text-xs text-blue-600 mt-1">
                  Upload a clear photo of the QR code printed on your Aadhaar card. The signed Secure QR is
                  cryptographically verified on the server and your identity fields are read directly from it.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Aadhaar Number"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
                <Input
                  label="Aadhaar-linked Mobile"
                  type="tel"
                  value={aadhaarMobile}
                  onChange={(e) => setAadhaarMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile on Aadhaar"
                  maxLength={10}
                />
              </div>
              {!qrVerified ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Upload a photo of your Aadhaar card
                  </label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer bg-gray-50 hover:border-gray-400"
                    onClick={() => document.getElementById("aadhaar-qr-input")?.click()}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadAadhaarQr(file);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id="aadhaar-qr-input"
                      disabled={qrLoading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAadhaarQr(file);
                      }}
                    />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600">Click to browse</span>, drag & drop, or use your camera
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Front or back of the Aadhaar card — the Secure QR is located and verified automatically
                    </p>
                  </div>
                  {qrLoading && (
                    <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Secure QR...
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-green-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Aadhaar Secure QR Verified</span>
                  </div>
                  {qrData && (
                    <div className="flex gap-4">
                      {qrData.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrData.photo}
                          alt="Aadhaar profile"
                          className="h-20 w-20 rounded-lg object-cover border border-green-200"
                        />
                      )}
                      <div className="text-sm text-green-800 space-y-1">
                        <p><span className="font-medium">Name:</span> {qrData.name}</p>
                        {qrData.dob && <p><span className="font-medium">DOB:</span> {qrData.dob}</p>}
                        {qrData.gender && <p><span className="font-medium">Gender:</span> {qrData.gender}</p>}
                        {qrData.address && <p><span className="font-medium">Address:</span> {qrData.address}</p>}
                        {qrData.uid && <p><span className="font-medium">Aadhaar:</span> {qrData.uid}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 7: Aadhaar OTP */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800 font-medium">Aadhaar OTP Verification</p>
                <p className="text-xs text-blue-600 mt-1">
                  A one-time password is sent by SMS to the mobile number registered with Aadhaar (UIDAI).
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Aadhaar: <span className="font-medium text-gray-900">{maskedAadhaar}</span>
                &nbsp;·&nbsp; Mobile: <span className="font-medium text-gray-900">{aadhaarMobile}</span>
              </p>
              {!aadhaarOtpVerified ? (
                <div className="space-y-3">
                  {!aadhaarOtpSent ? (
                    <Button onClick={sendAadhaarOtp} disabled={aadhaarOtpLoading} className="w-full">
                      {aadhaarOtpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Aadhaar OTP
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your Aadhaar-linked mobile</p>
                      <OtpInput length={6} onComplete={verifyAadhaarOtp} disabled={aadhaarOtpLoading} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Aadhaar OTP verified!</span>
                </div>
              )}
            </div>
          )}

          {/* Step 8: Review & Submit */}
          {step === 8 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Review Your Details</h3>
              <div className="rounded-lg bg-gray-50 p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{user.phone}</span></div>
                {bio && <div><span className="text-gray-500">Bio:</span> <span className="font-medium">{bio}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Experience</span><span className="font-medium">{experienceYears} years</span></div>
                <div>
                  <span className="text-gray-500">Skills: </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedSkills.map((s) => <Badge key={s} variant="info">{s}</Badge>)}
                  </div>
                </div>
                {workAddress && <div className="flex justify-between"><span className="text-gray-500">Work Address</span><span className="font-medium text-right max-w-[60%]">{workAddress}</span></div>}
                {latitude && longitude && <div className="flex justify-between"><span className="text-gray-500">Coordinates</span><span className="font-medium">{latitude}, {longitude}</span></div>}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Phone Verified</div>
                  <div className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Aadhaar Secure QR Verified</div>
                  <div className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Aadhaar OTP Verified</div>
                  {fileName && <div className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Document Uploaded</div>}
                </div>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-700">
                  Your Aadhaar verification is complete — you will be live and can accept jobs immediately.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            )}
            {step < 8 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed() || loading}
                className="flex-1"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={submitRegistration}
                disabled={loading || !canProceed()}
                className="flex-1"
                loading={loading}
              >
                Submit Registration
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
