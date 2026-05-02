import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import ImageUploader from './components/ImageUploader';
import { tryOnAPI, measurementsAPI, recommendAPI } from './api/client';
import { Ruler, Sparkles, ShoppingBag, Loader2, Heart, User, Search, ShoppingCart, Menu, X, ArrowRight, Star } from 'lucide-react';

const COMMUNITY_DATA = {
  hindu: {
    title: "Festive Celebrations",
    subtitle: "Hindu Traditional Wear",
    color: "from-orange-500 to-red-600",
    name: "Hindu",
    stitchPage: "/stitch/hindu.html"
  },
  muslim: {
    title: "Modest Elegance",
    subtitle: "Muslim Modest Wear",
    color: "from-emerald-600 to-teal-800",
    name: "Muslim",
    stitchPage: "/stitch/muslim.html"
  },
  sikh: {
    title: "Traditional Classics",
    subtitle: "Sikh Heritage",
    color: "from-amber-400 to-yellow-600",
    name: "Sikh",
    stitchPage: "/stitch/sikh.html"
  },
  buddhist: {
    title: "Zen & Harmony",
    subtitle: "Buddhist Attire",
    color: "from-red-800 to-rose-900",
    name: "Buddhist",
    stitchPage: "/stitch/buddhist.html"
  },
  christian: {
    title: "Sunday Grace",
    subtitle: "Christian Formals",
    color: "from-blue-600 to-indigo-800",
    name: "Christian",
    stitchPage: "/stitch/christian.html"
  }
};

function StitchRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-4xl font-heading text-primary mb-4">Aura<span className="text-gold">Fit</span></div>
        <p className="text-gray-400 text-sm uppercase tracking-widest animate-pulse">Loading Experience...</p>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="py-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 mb-20 text-center">
        <h2 className="text-5xl md:text-7xl font-heading font-bold text-primary mb-6 leading-tight">
          Welcome to the <br/><span className="text-gold italic">Global Bazaar.</span>
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg mb-8 font-light">
          Choose your community to explore curated collections tailored for your cultural events, daily modesty, and modern lifestyle.
        </p>
      </section>

      {/* Store Directory Cards — link to Stitch-generated HTML pages */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(COMMUNITY_DATA).map(([key, data]) => (
            <a key={key} href={data.stitchPage} className="group block h-64 rounded-xl overflow-hidden relative shadow-lg transform hover:-translate-y-2 transition duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-90 group-hover:opacity-100 transition duration-300`}></div>
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <h4 className="text-white/80 font-bold tracking-widest uppercase text-xs mb-2">{data.subtitle}</h4>
                <h3 className="text-3xl font-heading text-white mb-4">{data.title}</h3>
                <div className="flex items-center text-white/90 font-bold uppercase text-sm tracking-wide group-hover:text-gold transition">
                  Enter Store <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function StorePage() {
  const { community } = useParams();
  const navigate = useNavigate();
  const storeData = COMMUNITY_DATA[community];

  // If invalid store, go home
  useEffect(() => {
    if (!storeData) navigate("/");
  }, [community, storeData, navigate]);

  // State
  const [recommendations, setRecommendations] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');

  // Try-On State
  const [personImage, setPersonImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [height, setHeight] = useState(170);
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const tryOnRef = useRef(null);

  useEffect(() => {
    if (storeData) {
      setRecommendations([]); // clear old
      recommendAPI({ community: storeData.name, preferred_categories: ["Top", "Bottom", "Full Length", "Accessory", "Headwear"] })
        .then(data => setRecommendations(data))
        .catch(console.error);
    }
  }, [storeData]);

  const handleTryOn = async () => {
    if (!personImage || !garmentImage) {
      alert("Please upload both your photo and the garment image.");
      return;
    }
    
    setLoading(true);
    try {
      const [imgUrl, measurementsData] = await Promise.all([
        tryOnAPI(personImage, garmentImage),
        measurementsAPI(personImage, height)
      ]);
      setResultImage(imgUrl);
      setMeasurements(measurementsData);
    } catch (error) {
      console.error(error);
      alert("Error processing your request. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (!storeData) return null;

  return (
    <div>
      {/* Store Hero */}
      <section className={`relative w-full py-20 bg-gradient-to-r ${storeData.color} flex items-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full relative z-10 text-center">
          <p className="text-white/80 font-bold tracking-widest uppercase text-sm mb-4">{storeData.subtitle}</p>
          <h2 className="text-5xl md:text-6xl font-heading text-white mb-6">
            {storeData.title}
          </h2>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-16 bg-background max-w-7xl mx-auto px-4 lg:px-8">
        <h3 className="text-2xl font-bold font-heading text-primary mb-8 border-b border-gray-200 pb-4">Latest Arrivals</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {recommendations.length > 0 ? (
            recommendations.map((product, idx) => {
              const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0;
              
              return (
                <div key={idx} className="group cursor-pointer flex flex-col" onClick={() => setSelectedProduct(product)}>
                  <div className="relative aspect-[3/4] bg-surface rounded overflow-hidden mb-3 border border-gray-100 shadow-sm group-hover:shadow-md transition">
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <ShoppingBag className="text-gray-200 group-hover:scale-110 transition duration-500" size={64} />
                      )}
                    </div>
                    <button className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition z-10" onClick={(e) => e.stopPropagation()}>
                      <Heart size={18} />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-white/90 px-2 py-1 rounded text-[11px] font-bold flex items-center shadow-sm">
                      {product.rating} <Star className="text-green-500 ml-1 fill-green-500" size={10} />
                    </div>
                  </div>
                  
                  <div className="px-1 flex-grow flex flex-col">
                    <h4 className="font-bold text-primary text-[15px] mb-1">{product.brand || "Aura Luxe"}</h4>
                    <p className="text-gray-500 text-[13px] truncate mb-2 font-light">{product.name}</p>
                    <div className="mt-auto flex items-baseline space-x-2">
                      <span className="font-bold text-primary text-[15px]">${product.price}</span>
                      {product.original_price && (
                        <>
                          <span className="text-gray-400 line-through text-[12px]">${product.original_price}</span>
                          <span className="text-orange-500 text-[11px] font-bold">({discount}% OFF)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-4" size={32} />
              <p>Curating collections...</p>
            </div>
          )}
        </div>
      </section>

      {/* Editorial Banner (Ajio Inspired) */}
      <section className="bg-surface py-16 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center border border-gold/30 bg-primary overflow-hidden">
            <div className="w-full md:w-1/2 p-12 text-center md:text-left">
              <h3 className="text-4xl font-heading text-gold mb-4">The {storeData.name} Edit</h3>
              <p className="text-gray-300 mb-8 font-light leading-relaxed">
                Experience unparalleled craftsmanship with our premium selection for the {storeData.name} community. 
                Step into our Virtual Studio to see how prestige feels on you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Try-On Experience Studio */}
      <section ref={tryOnRef} className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading text-primary mb-4">The Fitting Room Studio</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Upload your photo to see how garments drape, fit, and flow across your unique body proportions using our advanced AI.</p>
          </div>

          <div className="bg-surface shadow-2xl border border-gray-200 overflow-hidden flex flex-col lg:flex-row">
            <div className="w-full lg:w-5/12 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/30 flex flex-col justify-center">
              <div className="space-y-8 mb-10">
                <div>
                  <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center"><User size={16} className="mr-2"/> 1. Your Profile</h4>
                  <ImageUploader label="Upload Your Photo" onImageSelected={setPersonImage} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center"><ShoppingBag size={16} className="mr-2"/> 2. The Garment</h4>
                  <ImageUploader label="Upload Garment Image" onImageSelected={setGarmentImage} />
                </div>
              </div>
              
              <div className="mb-10">
                <label className="block text-sm font-bold text-primary uppercase tracking-widest mb-3">3. Height (For Scale)</label>
                <div className="flex items-center bg-white border border-gray-300 p-1">
                  <span className="pl-4 text-gray-400 font-bold">CM</span>
                  <input 
                    type="number" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-2 bg-transparent focus:outline-none font-bold text-primary text-right"
                  />
                </div>
              </div>

              <button 
                onClick={handleTryOn}
                disabled={loading}
                className="w-full bg-primary text-gold py-4 font-bold uppercase tracking-widest text-sm hover:bg-gold hover:text-primary transition duration-300 shadow-md flex justify-center items-center"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Generate AI Fitting'}
              </button>
            </div>

            <div className="w-full lg:w-7/12 bg-white relative min-h-[500px] flex flex-col">
              <div className="flex-grow flex items-center justify-center p-8">
                {resultImage ? (
                  <img src={resultImage} alt="Try-On Result" className="max-h-[600px] object-contain drop-shadow-xl" />
                ) : (
                  <div className="text-center text-gray-300">
                    <Sparkles className="mx-auto mb-6 opacity-30" size={64} />
                    <p className="font-heading text-2xl text-primary mb-2">Awaiting Magic</p>
                    <p className="text-sm font-light max-w-xs mx-auto">Your personalized AI try-on rendering will appear here.</p>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <Loader2 className="animate-spin text-gold mb-6" size={48} />
                    <p className="font-bold text-primary tracking-widest uppercase text-sm animate-pulse">Analyzing Proportions...</p>
                  </div>
                )}
              </div>
              {measurements && (
                <div className="bg-gray-50 border-t border-gray-100 p-8">
                  <div className="flex justify-between items-end mb-6">
                    <h4 className="font-heading text-2xl text-primary">Body Analysis</h4>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recommended Size</span>
                      <span className="bg-gold text-primary font-bold px-4 py-1 text-lg inline-block">
                        {measurements.recommended_size}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="border-l-2 border-gold pl-4">
                      <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Shoulders</span>
                      <span className="font-bold text-primary text-lg">{measurements.shoulder_width}</span>
                    </div>
                    <div className="border-l-2 border-gold pl-4">
                      <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Torso</span>
                      <span className="font-bold text-primary text-lg">{measurements.torso_length}</span>
                    </div>
                    <div className="border-l-2 border-gold pl-4">
                      <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Hips</span>
                      <span className="font-bold text-primary text-lg">{measurements.hip_width}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end bg-primary/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md md:max-w-xl bg-surface h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-surface z-10">
              <h3 className="font-bold text-primary tracking-wide uppercase text-sm">Product Details</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow p-6">
              <div className="aspect-[3/4] bg-gray-100 rounded mb-6 flex items-center justify-center border border-gray-200 overflow-hidden">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="text-gray-300" size={80} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-primary mb-1">{selectedProduct.brand || "Aura Luxe"}</h2>
              <p className="text-gray-600 mb-4 font-light text-lg">{selectedProduct.name}</p>
              
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-100">
                <span className="text-2xl font-bold text-primary">${selectedProduct.price}</span>
                {selectedProduct.original_price && (
                  <>
                    <span className="text-gray-400 line-through text-lg">MRP ${selectedProduct.original_price}</span>
                    <span className="text-orange-500 font-bold tracking-wider">
                      ({Math.round((1 - selectedProduct.price / selectedProduct.original_price) * 100)}% OFF)
                    </span>
                  </>
                )}
              </div>
              
              <div className="mb-8">
                <div className="flex justify-between items-end mb-4">
                  <h4 className="font-bold text-primary uppercase text-sm tracking-widest">Select Size</h4>
                  <span className="text-gold text-xs font-bold uppercase underline cursor-pointer">Size Chart</span>
                </div>
                <div className="flex space-x-3">
                  {['S', 'M', 'L', 'XL'].map(size => (
                    <button 
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 w-12 rounded-full border flex items-center justify-center font-bold transition ${
                        selectedSize === size 
                          ? 'border-primary bg-primary text-gold' 
                          : 'border-gray-300 text-gray-600 hover:border-gold'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button className="bg-primary text-gold font-bold py-4 uppercase tracking-widest text-sm hover:bg-gray-900 transition flex justify-center items-center">
                   <ShoppingCart size={18} className="mr-2"/> Add to Bag
                </button>
                <button className="border border-gray-300 text-primary font-bold py-4 uppercase tracking-widest text-sm hover:border-primary transition flex justify-center items-center">
                   <Heart size={18} className="mr-2"/> Wishlist
                </button>
              </div>

              <div className="bg-gold/10 border border-gold/30 p-6 text-center rounded">
                <Sparkles className="mx-auto text-gold mb-3" size={24}/>
                <h4 className="font-heading text-xl text-primary mb-2">Not sure about the fit?</h4>
                <p className="text-gray-600 text-sm mb-4">See exactly how this looks on your body with our AI Virtual Try-On.</p>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    if(tryOnRef.current) tryOnRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-gold text-primary px-6 py-2 font-bold uppercase tracking-widest text-xs hover:bg-yellow-500 transition"
                >
                  Try It On Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background font-body text-primary flex flex-col">
      {/* Top Banner */}
      <div className="bg-primary text-gold text-xs font-semibold text-center py-2 px-4 tracking-wider uppercase">
        ✨ Complimentary Shipping on Orders Over $150 | Discover the Luxe Collection ✨
      </div>

      {/* Main Navigation */}
      <header className="bg-surface sticky top-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            <Menu className="lg:hidden text-primary cursor-pointer" size={24} />
            <Link to="/" className="text-3xl font-bold font-heading tracking-tight text-primary">
              Aura<span className="text-gold">Fit</span>
            </Link>
          </div>

          <div className="flex flex-1 max-w-2xl px-8 hidden lg:block">
            <div className="relative text-gray-500 w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search across all our stores..." 
                className="bg-gray-50 w-full pl-12 pr-4 py-2.5 rounded-sm border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-gold transition"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-primary">
            <button className="flex flex-col items-center hover:text-gold transition">
              <User size={22} className="mb-1 stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
            </button>
            <button className="flex flex-col items-center hover:text-gold transition relative">
              <Heart size={22} className="mb-1 stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Wishlist</span>
            </button>
            <a href="/stitch/bag.html" className="flex flex-col items-center hover:text-gold transition relative">
              <ShoppingCart size={22} className="mb-1 stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Bag</span>
              <span className="absolute -top-2 -right-2 bg-gold text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">2</span>
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<StitchRedirect to="/stitch/home.html" />} />
          <Route path="/store/:community" element={<StorePage />} />
        </Routes>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-gray-300 py-16 border-t border-gold/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid md:grid-cols-4 gap-12">
          <div>
            <h1 className="text-3xl font-bold font-heading text-white mb-6">Aura<span className="text-gold">Fit</span></h1>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Redefining online shopping. Discover styles tailored to your culture and community, and experience them with flawless AI fitting.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Stores</h4>
            <ul className="space-y-3 text-sm font-light text-gray-400">
              <li><a href="/stitch/hindu.html" className="hover:text-gold transition">Festive Celebrations</a></li>
              <li><a href="/stitch/muslim.html" className="hover:text-gold transition">Modest Elegance</a></li>
              <li><a href="/stitch/sikh.html" className="hover:text-gold transition">Traditional Classics</a></li>
              <li><a href="/stitch/buddhist.html" className="hover:text-gold transition">Zen &amp; Harmony</a></li>
              <li><a href="/stitch/christian.html" className="hover:text-gold transition">Sunday Grace</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Help</h4>
            <ul className="space-y-3 text-sm font-light text-gray-400">
              <li><a href="#" className="hover:text-gold transition">Track Order</a></li>
              <li><a href="#" className="hover:text-gold transition">Returns & Exchanges</a></li>
              <li><a href="#" className="hover:text-gold transition">Customer Care</a></li>
              <li><a href="#" className="hover:text-gold transition">Size Guide</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Experience App</h4>
            <div className="flex flex-col space-y-3">
               <div className="border border-gray-700 bg-gray-800/50 p-3 flex items-center justify-center cursor-pointer hover:border-gold transition">
                 <span className="text-sm font-bold uppercase tracking-widest text-white">Google Play</span>
               </div>
               <div className="border border-gray-700 bg-gray-800/50 p-3 flex items-center justify-center cursor-pointer hover:border-gold transition">
                 <span className="text-sm font-bold uppercase tracking-widest text-white">App Store</span>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
