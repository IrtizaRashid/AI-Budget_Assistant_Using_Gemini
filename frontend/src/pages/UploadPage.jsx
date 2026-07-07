import { useState, useRef } from 'react';

export default function UploadPage() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!image) {
      setError('Please upload an image.');
      return;
    }
    if (!height || !weight) {
      setError('Please enter both height and weight.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', image);
      formData.append('height', height);
      formData.append('heightUnit', heightUnit);
      formData.append('weight', weight);
      formData.append('weightUnit', weightUnit);

      // Simulate API call — replace with real endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const resultData = {
        image: image.name,
        imageSize: `${(image.size / 1024).toFixed(2)} KB`,
        height: `${height} ${heightUnit}`,
        weight: `${weight} ${weightUnit}`,
        timestamp: new Date().toISOString(),
        message: 'Upload successful',
      };

      setResult(resultData);
      setImage(null);
      setImagePreview(null);
      setHeight('');
      setWeight('');
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setHeight('');
    setWeight('');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f3] via-[#f5f1e8] to-[#ede8df] py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-50 to-orange-100 opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-serif font-light text-neutral-800 mb-3 tracking-tight">
            Profile Upload
          </h1>
          <p className="text-lg text-neutral-600 font-light">
            Share your photo and measurements for personalized styling insights
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="p-8 sm:p-10">
            {/* Image upload section */}
            <div className="mb-10">
              <label className="block text-sm font-medium text-neutral-700 mb-4 tracking-wide">
                Upload Photo
              </label>

              {!imagePreview ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-neutral-300 bg-neutral-50/50 hover:border-amber-400 hover:bg-amber-50/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-12 h-12 text-amber-500 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 1110.233-2.33A3 3 0 0116.5 19.5H6.75z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-neutral-800">
                        Drag your photo here
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        or click to browse
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto max-h-80 object-cover"
                  />
                  <button
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-4 right-4 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Measurements section */}
            <div className="space-y-6 mb-8">
              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3 tracking-wide">
                  Height
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Enter height"
                    className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 bg-white/60 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                  <select
                    value={heightUnit}
                    onChange={(e) => setHeightUnit(e.target.value)}
                    className="px-4 py-3 rounded-lg border border-neutral-300 bg-white/60 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3 tracking-wide">
                  Weight
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter weight"
                    className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 bg-white/60 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="px-4 py-3 rounded-lg border border-neutral-300 bg-white/60 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={loading || !image}
                className="flex-1 px-6 py-3 rounded-lg border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !image || !height || !weight}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>Upload</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Result card */}
        {result && (
          <div className="mt-8 animate-fade-in-up">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                <h2 className="text-2xl font-serif font-light text-neutral-800">
                  Upload Successful
                </h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                  <span className="text-neutral-600">File</span>
                  <span className="font-medium text-neutral-800">{result.image}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                  <span className="text-neutral-600">Size</span>
                  <span className="font-medium text-neutral-800">{result.imageSize}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                  <span className="text-neutral-600">Height</span>
                  <span className="font-medium text-neutral-800">{result.height}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                  <span className="text-neutral-600">Weight</span>
                  <span className="font-medium text-neutral-800">{result.weight}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Timestamp</span>
                  <span className="font-medium text-neutral-800 text-sm">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* JSON Response */}
              <div className="mb-6">
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-3">
                  Response
                </p>
                <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-amber-100 text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  setHeight('');
                  setWeight('');
                }}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
