import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatBDT, formatPoints, formatDate } from '../../utils/formatters';
import { resolveProductImage, IMAGE_ASSETS } from '../../utils/imageAssets';
import { storage } from '../../services/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Store,
  Check,
  Edit2,
  Trash2,
  Send,
  MessageSquare,
  AlertCircle,
  Image as ImageIcon,
  Camera,
  Upload,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    currentView,
    selectedProductId,
    products,
    reviews,
    navigateTo,
    closeProductModal,
    addToCart,
    openCartDrawer,
    openAuthModal,
    toggleWishlist,
    isInWishlist,
    checkReviewEligibility,
    submitProductReview,
    updateProductReview,
    deleteProductReview,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'delivery'>('details');

  // Review Form State & Photo Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImageUrl, setReviewImageUrl] = useState('');
  const [selectedReviewFile, setSelectedReviewFile] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProductModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeProductModal]);

  if (currentView !== 'product_detail' || !selectedProductId) return null;

  const product = products.find((p) => p.id === selectedProductId);
  if (!product) return null;

  const isWishlisted = isInWishlist(product.id);
  const canUserRedeemWithPoints =
    product.canRedeemWithPoints &&
    product.pointPrice &&
    currentUser &&
    currentUser.pointsBalance >= product.pointPrice;

  // Filter reviews for this product
  const productReviews = reviews.filter(
    (r) => r.productId === product.id && (r.status === 'published' || (currentUser && r.customerId === currentUser.id))
  );

  const calculatedRating = productReviews.length > 0
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
    : product.rating;

  const eligibility = checkReviewEligibility(product.id);
  const myExistingReview = currentUser
    ? productReviews.find((r) => r.customerId === currentUser.id)
    : null;

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigateTo('checkout');
  };

  const compressImageToDataUrl = (file: File, maxDim = 400, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
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

  const handleReviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedReviewFile(file);
    try {
      // Compress to lightweight thumbnail (< 50KB) for free-plan compatibility
      const compressed = await compressImageToDataUrl(file);
      setReviewImagePreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReviewPhoto = () => {
    setSelectedReviewFile(null);
    setReviewImagePreview(null);
    setReviewImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast('Please enter your review text.', 'error');
      return;
    }
    setIsSubmittingReview(true);
    try {
      let finalImageUrl = reviewImageUrl.trim();

      // If a file was selected, upload to Firebase Storage or use DataURL fallback
      if (selectedReviewFile && currentUser) {
        setIsUploadingImage(true);
        if (storage) {
          try {
            const ext = selectedReviewFile.name.split('.').pop() || 'jpg';
            const cleanFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const fileRef = ref(storage, `reviews/${currentUser.id}/${cleanFileName}`);
            await uploadBytes(fileRef, selectedReviewFile);
            finalImageUrl = await getDownloadURL(fileRef);
          } catch (storageErr) {
            console.warn('Firebase Storage upload error, falling back to embedded preview:', storageErr);
            if (reviewImagePreview) {
              finalImageUrl = reviewImagePreview;
            }
          }
        } else if (reviewImagePreview) {
          finalImageUrl = reviewImagePreview;
        }
        setIsUploadingImage(false);
      } else if (!finalImageUrl && reviewImagePreview) {
        finalImageUrl = reviewImagePreview;
      }

      const reviewPayloadImages = finalImageUrl ? [finalImageUrl] : [];

      if (editingReviewId) {
        const res = await updateProductReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment,
          images: reviewPayloadImages,
        });
        if (res.success) {
          setEditingReviewId(null);
          setReviewComment('');
          handleRemoveReviewPhoto();
        }
      } else {
        const res = await submitProductReview({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment,
          images: reviewPayloadImages,
        });
        if (res.success) {
          setReviewComment('');
          handleRemoveReviewPhoto();
        }
      }
    } finally {
      setIsSubmittingReview(false);
      setIsUploadingImage(false);
    }
  };

  const handleStartEditReview = (r: typeof myExistingReview) => {
    if (!r) return;
    setEditingReviewId(r.id);
    setReviewRating(r.rating);
    setReviewComment(r.comment);
    const existingImg = r.images?.[0] || '';
    setReviewImageUrl(existingImg);
    setReviewImagePreview(existingImg || null);
    setSelectedReviewFile(null);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewComment('');
    handleRemoveReviewPhoto();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete your review?')) {
      await deleteProductReview(reviewId);
      if (editingReviewId === reviewId) {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={closeProductModal}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full z-10 border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Top Bar with Close button */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 overflow-hidden truncate">
            <span
              onClick={closeProductModal}
              className="hover:underline cursor-pointer shrink-0"
            >
              Marketplace
            </span>
            <span>/</span>
            <span
              onClick={() => navigateTo('products')}
              className="hover:underline cursor-pointer shrink-0"
            >
              {product.category}
            </span>
            <span>/</span>
            <span className="font-medium text-slate-800 truncate">
              {product.title}
            </span>
          </div>

          <button
            onClick={closeProductModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            {/* Gallery Column */}
            <div className="space-y-3">
              <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={resolveProductImage(product.images?.[0])}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = IMAGE_ASSETS.defaultProduct;
                  }}
                />
                {product.discountPercent && product.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#F47B44] text-white text-xs font-bold rounded">
                    Save {product.discountPercent}%
                  </span>
                )}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs text-slate-700 hover:text-red-500 rounded-full transition-colors shadow-xs"
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </button>
              </div>

              {/* Trust Callouts */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#F47B44] shrink-0" />
                  <span className="text-slate-700 font-medium">100% Genuine</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs">
                  <RotateCcw className="w-4 h-4 text-[#F47B44] shrink-0" />
                  <span className="text-slate-700 font-medium">7-Day Return</span>
                </div>
              </div>
            </div>

            {/* Product Details & Purchase Module */}
            <div className="space-y-4 sm:space-y-5">
              {/* Shop Badge */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateTo('shop_profile', { shopId: product.shopId })}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#142B4A] transition-colors truncate"
                >
                  <Store className="w-3.5 h-3.5 text-[#F47B44] shrink-0" />
                  <span className="truncate">Sold by: <strong className="text-[#142B4A]">{product.shopName}</strong></span>
                </button>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  Verified Vendor
                </span>
              </div>

              {/* Title & Reviews summary */}
              <div>
                <h1 className="text-base sm:text-xl font-bold text-[#142B4A] leading-snug">
                  {product.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="ml-1 font-bold text-slate-800 font-mono">
                      {calculatedRating.toFixed(1)}
                    </span>
                  </div>
                  <span>·</span>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="hover:underline text-slate-600 font-semibold cursor-pointer text-[#142B4A]"
                  >
                    {productReviews.length} customer review{productReviews.length !== 1 ? 's' : ''}
                  </button>
                  <span>·</span>
                  <span className="text-slate-700 font-medium">Pack size: {product.unit}</span>
                </div>
              </div>

              {/* Pricing Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#142B4A] font-mono tabular-nums">
                    {formatBDT(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs sm:text-sm text-slate-400 line-through font-mono">
                      {formatBDT(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 ml-auto font-medium">
                    Inclusive of taxes
                  </span>
                </div>

                {/* REFERO Points Reward Info Box */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#142B4A]">
                    <Sparkles className="w-4 h-4 text-[#F47B44] shrink-0" />
                    <span className="text-[11px] sm:text-xs">
                      Earn <strong className="text-[#F47B44]">+{product.pointsEarned > 0 ? product.pointsEarned * quantity : Math.round((product.price * quantity * 5) / 100)} REFERO Points</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => navigateTo('policy_points')}
                    className="text-[10px] sm:text-[11px] text-[#142B4A] hover:underline font-semibold shrink-0"
                  >
                    Policy
                  </button>
                </div>

                {/* Point-Only Redemption Option */}
                {product.canRedeemWithPoints && product.pointPrice && (
                  <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-1">
                    <span>
                      Redeem 100% with Points: <strong>{formatPoints(product.pointPrice)} pts</strong>
                    </span>
                    {canUserRedeemWithPoints ? (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Eligible
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Need {formatPoints(product.pointPrice - (currentUser?.pointsBalance || 0))} more pts
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity Stepper & Stock */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Quantity</span>
                  <span className="text-slate-500 font-normal">
                    {product.stock > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        ✓ In Stock ({product.stock} available)
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">Out of stock</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-1 text-sm font-bold font-mono tabular-nums text-slate-800">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-500">
                    Total: <strong className="font-mono text-[#142B4A] text-sm">{formatBDT(product.price * quantity)}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3 border rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0 ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  aria-label={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 py-3 px-3 sm:px-4 bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="py-3 px-4 sm:px-6 bg-[#F47B44] hover:bg-[#e06830] active:scale-98 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-40"
                >
                  Buy Now
                </button>
              </div>

              {/* Product Tabs: Details, Delivery, Reviews */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-xs font-semibold mb-3 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'details'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab('delivery')}
                    className={`pb-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'delivery'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Delivery & Returns
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'reviews'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span>Reviews</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] text-slate-600 font-mono">
                      {productReviews.length}
                    </span>
                  </button>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  {activeTab === 'details' && (
                    <p>{product.description}</p>
                  )}

                  {activeTab === 'delivery' && (
                    <div className="space-y-2">
                      <p>
                        <strong>Dhaka Metropolitan:</strong> Same-day or 24-hour delivery via express dispatch. Delivery fee ৳60 (Free on orders over ৳999).
                      </p>
                      <p>
                        <strong>All Other Districts:</strong> 48 to 72 hours via courier tracking. Delivery fee ৳120.
                      </p>
                      <p className="text-slate-500 pt-1 border-t border-slate-100">
                        <strong>Return Policy:</strong> 7-day hassle-free replacement or return for unsealed or damaged products.
                      </p>
                    </div>
                  )}

                  {/* CUSTOMER PRODUCT REVIEWS TAB (SECTION 5) */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-4">
                      {/* Review Eligibility Banner or Form */}
                      {currentUser ? (
                        eligibility.isEligible || editingReviewId ? (
                          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                <span>{editingReviewId ? 'Edit Your Review' : 'Verified Buyer Review'}</span>
                              </h4>
                              {editingReviewId && (
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="text-[11px] text-slate-500 hover:text-slate-800"
                                >
                                  Cancel Edit
                                </button>
                              )}
                            </div>

                            <form onSubmit={handleReviewSubmit} className="space-y-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Your Star Rating:
                                </label>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      type="button"
                                      key={star}
                                      onClick={() => setReviewRating(star)}
                                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      <Star
                                        className={`w-5 h-5 ${
                                          star <= reviewRating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                  <span className="ml-2 font-mono font-bold text-slate-700 text-xs">
                                    {reviewRating} of 5 Stars
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Review Comment:
                                </label>
                                <textarea
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="How was the quality, aroma, packaging, and fulfillment experience?"
                                  rows={2}
                                  required
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#142B4A]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Attach Product Photo (Optional, JPEG/PNG/WebP &le; 5MB):
                                </label>

                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleReviewFileChange}
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                />

                                {reviewImagePreview ? (
                                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                    <img
                                      src={reviewImagePreview}
                                      alt="Selected review attachment"
                                      className="w-12 h-12 rounded-md object-cover border border-slate-200"
                                    />
                                    <div className="flex-1 min-w-0 text-xs">
                                      <p className="font-semibold text-slate-800 truncate">
                                        {selectedReviewFile ? selectedReviewFile.name : 'Attached photo'}
                                      </p>
                                      <p className="text-[10px] text-emerald-700 font-medium">Ready to upload to Firebase Storage</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleRemoveReviewPhoto}
                                      className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Camera className="w-3.5 h-3.5 text-[#F47B44]" />
                                      <span>Choose Photo File</span>
                                    </button>
                                    <span className="text-[11px] text-slate-400">or paste URL:</span>
                                    <input
                                      type="url"
                                      value={reviewImageUrl}
                                      onChange={(e) => {
                                        setReviewImageUrl(e.target.value);
                                        if (e.target.value.trim()) {
                                          setReviewImagePreview(e.target.value.trim());
                                        }
                                      }}
                                      placeholder="https://..."
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                                    />
                                  </div>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={isSubmittingReview || isUploadingImage}
                                className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>
                                  {isUploadingImage
                                    ? 'Uploading Photo...'
                                    : isSubmittingReview
                                    ? 'Submitting Review...'
                                    : editingReviewId
                                    ? 'Save Changes'
                                    : 'Post Verified Review'}
                                </span>
                              </button>
                            </form>
                          </div>
                        ) : myExistingReview ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>You have already submitted a review for this purchase.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEditReview(myExistingReview)}
                                className="px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-slate-500" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteReview(myExistingReview.id)}
                                className="px-2.5 py-1 text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ) : null
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            Purchased this item? Sign in to submit a verified purchase review.
                          </span>
                          <button
                            onClick={() => openAuthModal('login')}
                            className="px-3 py-1.5 bg-[#142B4A] text-white font-bold rounded-lg hover:bg-[#1E3A5F] transition-colors cursor-pointer shrink-0 text-[11px]"
                          >
                            Sign In
                          </button>
                        </div>
                      )}

                      {/* Reviews List */}
                      <div className="space-y-2.5 pt-1">
                        {productReviews.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                            <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-slate-700">No reviews yet for this product</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Be the first to review after receiving your order!</p>
                          </div>
                        ) : (
                          productReviews.map((r) => (
                            <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <strong className="text-slate-800">{r.customerName}</strong>
                                <div className="flex items-center gap-1 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                              {r.images && r.images.length > 0 && r.images[0] && (
                                <div className="pt-1.5">
                                  <img
                                    src={r.images[0]}
                                    alt="Review attachment"
                                    className="w-20 h-20 rounded-lg object-cover border border-slate-200 hover:scale-105 transition-transform cursor-pointer"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                                <span>Reviewed on {formatDate(r.createdAt)}</span>
                                {currentUser && r.customerId === currentUser.id && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleStartEditReview(r)}
                                      className="text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReview(r.id)}
                                      className="text-red-500 hover:text-red-700 underline font-semibold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
