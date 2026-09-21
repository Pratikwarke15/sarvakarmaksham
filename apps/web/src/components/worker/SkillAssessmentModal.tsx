"use client";

import { useState, useEffect } from "react";
import { Award, CheckCircle, XCircle, Clock, AlertCircle, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";

interface SkillAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCompleted?: () => void;
  categorySlug?: string;
  categoryName?: string;
}

export function SkillAssessmentModal({
  open,
  onClose,
  onSuccess,
  onCompleted,
  categorySlug = "electrical",
}: SkillAssessmentModalProps) {
  const { toast } = useToast();
  const [selectedTrade, setSelectedTrade] = useState(categorySlug || "electrical");
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      loadAssessment(selectedTrade);
    }
  }, [open, selectedTrade]);

  const loadAssessment = async (trade: string) => {
    setLoading(true);
    setResult(null);
    setAnswers({});
    try {
      const res = await apiGet<{ success: boolean; [key: string]: any }>(`/skills/assessments/${trade}`);
      if (res.success) {
        setAssessment(res);
      }
    } catch {
      toast({ title: "Could not load assessment questions", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!assessment || Object.keys(answers).length < assessment.questions.length) {
      toast({ title: "Please answer all questions before submitting", variant: "danger" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; [key: string]: any }>(
        `/skills/assessments/${selectedTrade}/submit`,
        { answers }
      );

      if (res.success) {
        setResult(res);
        if (res.passed) {
          toast({ title: "Congratulations! You passed the assessment", variant: "success" });
          if (onSuccess) onSuccess();
          if (onCompleted) onCompleted();
        } else {
          toast({ title: `Score: ${res.scorePercentage}%. Passing threshold is 70%`, variant: "danger" });
        }
      }
    } catch {
      toast({ title: "Error submitting assessment", variant: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-200">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-heading">Shramik Skill Assessment</h2>
            <p className="text-xs text-amber-800 font-medium">
              Platform Skill Test · Earn &quot;Assessment Verified&quot; Badge (Path B)
            </p>
          </div>
        </div>

        {/* Disclaimer Alert */}
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            This assessment tests practical trade scenarios. This is an independent Shramik platform test and not an official government ITI certificate.
          </span>
        </div>

        {/* Trade Selector Tabs */}
        {!result && (
          <div className="mt-5 flex gap-2 border-b border-gray-200 pb-3">
            {[
              { slug: "electrical", label: "Electrician" },
              { slug: "plumbing", label: "Plumber" },
              { slug: "ac-repair", label: "AC Repair" },
            ].map((t) => (
              <button
                key={t.slug}
                onClick={() => setSelectedTrade(t.slug)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  selectedTrade === t.slug
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Questions list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : result ? (
          /* Result View */
          <div className="mt-6 space-y-4 animate-slide-up">
            <div
              className={`rounded-2xl border p-6 text-center ${
                result.passed
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                  : "border-red-200 bg-red-50/60 text-red-900"
              }`}
            >
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white ${
                  result.passed ? "bg-emerald-600" : "bg-red-500"
                }`}
              >
                {result.passed ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
              </div>

              <h3 className="text-xl font-bold">
                {result.passed ? "Assessment Passed!" : "Assessment Not Passed"}
              </h3>
              <p className="mt-1 text-sm font-semibold">
                Score: {result.scorePercentage}% ({result.correctCount} of {result.totalQuestions} correct)
              </p>

              {result.passed && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-200/60 px-3 py-1 text-xs font-bold text-emerald-800">
                  <Award className="h-4 w-4 text-emerald-700" />
                  Badge Awarded: Assessment Verified
                </div>
              )}
            </div>

            {/* Answer Explanations */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900">Scenario Review & Explanations:</h4>
              {result.feedback?.map((fb: any, idx: number) => (
                <div key={fb.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-xs">
                  <p className="font-semibold text-gray-900">
                    {idx + 1}. {fb.question}
                  </p>
                  <p className="mt-1 text-emerald-700 font-medium">
                    ✓ {fb.explanation}
                  </p>
                </div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full mt-4">
              Close & Return to Dashboard
            </Button>
          </div>
        ) : (
          /* Question form */
          <div className="mt-6 space-y-6">
            {assessment?.questions?.map((q: any, idx: number) => (
              <div key={q.id} className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                <p className="font-semibold text-gray-900 text-sm">
                  {idx + 1}. {q.question}
                </p>

                <div className="mt-3 space-y-2">
                  {q.options?.map((opt: string, optIdx: number) => {
                    const isSelected = answers[q.id] === optIdx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-11 text-sm font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating Responses...
                </>
              ) : (
                <>Submit Assessment for Verification</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillAssessmentModal;
