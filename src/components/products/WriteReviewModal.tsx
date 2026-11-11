import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { storage } from '../../services/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  X,
  Star,
  Camera,
  Send,
  ShieldCheck,
  Package,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string;
  productId: string;
  productTitle?: string;
  productImage?: string;
  onSuccess?: () => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  productId,
  productTitle,
  productImage,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { products, orders, submitProductReview, showToast } = useStore();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Resolve product info if not passed directly
  const foundProduct = products.find((p) => p.id === productId);
  const foundOrder = orders.find((o) => o.id === orderId);
  const foundOrderItem = foundOrder?.items.find((it) => it.productId === productId);

  const displayTitle = productTitle || foundProduct?.title || foundOrderItem?.title || 'Product';
  const displayImage = productImage || foundProduct?.images?.[0] || foundOrderItem?.image;
  const displayOrderNumber = orderNumber || foundOrder?.orderNumber || orderId.slice(-6).toUpperCase();

  const starLabels: Record<number, string> = {
    1: '1 - Poor Experience',
    2: '2 - Fair Quality',
    3: '3 - Good & Acceptable',
    4: '4 - Very Good Quality',
    5: '5 - Excellent, Loved it!',
  };

  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
          let width = img.width;
          let height = img.height;
          const quality = 0.75;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPEG, PNG, or WebP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be 5MB or smaller.', 'error');
      return;
    }

    setSelectedFile(file);
    try {
      const compressed = await compressImageToDataUrl(file);
      setImagePreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser) {
      setErrorMsg('Please sign in to write a review.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg('Please write a genuine review with at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl.trim();

      if (selectedFile && currentUser) {
        setIsUploadingImage(true);
        if (storage) {
          try {
            const ext = selectedFile.name.split('.').pop() || 'jpg';
            const cleanFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const fileRef = ref(storage, `reviews/${currentUser.id}/${cleanFileName}`);
            await uploadBytes(fileRef, selectedFile);
            finalImageUrl = await getDownloadURL(fileRef);
          } catch (storageErr) {
            console.warn('Firebase Storage upload error, falling back to embedded preview:', storageErr);
            if (imagePreview) {
              finalImageUrl = imagePreview;
            }
          }
        } else if (imagePreview) {
          finalImageUrl = imagePreview;
        }
        setIsUploadingImage(false);
      } else if (!finalImageUrl && imagePreview) {
        finalImageUrl = imagePreview;
      }

      const res = await submitProductReview({
        productId,
        orderId,
        rating,
        comment: comment.trim(),
        images: finalImageUrl ? [finalImageUrl] : [],
      });

      if (res.success) {
        showToast('Review submitted successfully! Thank you for your feedback.', 'success');
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#142B4A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-[#F47B44] fill-[#F47B44]" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Write a Product Review</h3>
              <p className="text-[11px] text-slate-300">Verified purchase from Order #{displayOrderNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Product Banner */}
          <div className="flex items-center gap-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayTitle}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-[#142B4A] truncate">{displayTitle}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Purchase</span>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} id="review-form" className="space-y-4">
            {/* Star Rating Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Overall Rating <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-hidden"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        star <= activeRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 hover:text-amber-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-xs font-bold text-slate-700">
                  {starLabels[activeRating]}
                </span>
              </div>
            </div>

            {/* Review Comment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Your Review <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{comment.length} / 1000 characters</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike about this product? How was the freshness, packaging, or taste?"
                rows={4}
                maxLength={1000}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#142B4A] focus:ring-2 focus:ring-[#142B4A]/10 transition-all resize-none"
              />
            </div>

            {/* Photo Attachment (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Add Photo <span className="text-slate-400 font-normal">(Optional, max 5MB)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              {imagePreview ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <img
                    src={imagePreview}
                    alt="Review attachment"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-2xs"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-slate-800 truncate">
                      {selectedFile ? selectedFile.name : 'Attached Photo'}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">Ready to attach to review</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-[#F47B44]" />
                    <span>Upload Image</span>
                  </button>
                  <span className="text-center sm:text-left text-[11px] text-slate-400">or paste image URL:</span>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setImagePreview(e.target.value.trim());
                      }
                    }}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#142B4A]"
                  />
                </div>
              )}
            </div>

            {/* Loyalty Reminder */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-[#F47B44] shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Honest reviews help other shoppers make informed decisions across the REFERO marketplace community.
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploadingImage}
            className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="review-form"
            disabled={isSubmitting || isUploadingImage || comment.trim().length < 5}
            className="px-5 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isUploadingImage ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isUploadingImage ? 'Uploading Image...' : 'Submitting Review...'}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Review</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
