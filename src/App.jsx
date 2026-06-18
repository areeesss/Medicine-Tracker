import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  Clock, 
  Info, 
  Flame, 
  Calendar, 
  Sparkles, 
  X,
  RotateCcw,
  Volume2,
  VolumeX,
  GripVertical,
  Minus
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, StatusBarStyle } from '@capacitor/status-bar';
import { App as AppPlugin } from '@capacitor/app';

// Platform detection
const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
const isCapacitor = Capacitor.isNativePlatform();


// Utility to get local date string YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility to calculate yesterday's date string YYYY-MM-DD
const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
};

export default function App() {
  // PWA register hook
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Window control handlers for Tauri
  const handleMinimize = async () => {
    if (isTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().minimize();
    }
  };

  const handleClose = async () => {
    if (isTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    }
  };

  // Core States
  const [medications, setMedications] = useState(() => {
    const storedMeds = localStorage.getItem('meds_tracker_list');
    if (!storedMeds) return [];
    try {
      const parsed = JSON.parse(storedMeds);
      if (Array.isArray(parsed)) {
        return parsed.map(m => ({
          ...m,
          dosesRequired: m.dosesRequired || 1,
          dosesTaken: m.dosesTaken !== undefined ? m.dosesTaken : (m.taken ? 1 : 0),
          taken: m.taken !== undefined ? m.taken : false
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [lastResetDate, setLastResetDate] = useState(() => {
    const storedResetDate = localStorage.getItem('meds_tracker_last_reset');
    if (storedResetDate) return storedResetDate;
    const todayStr = getLocalDateString();
    localStorage.setItem('meds_tracker_last_reset', todayStr);
    return todayStr;
  });
  const [streak, setStreak] = useState(() => {
    const storedStreak = localStorage.getItem('meds_tracker_streak');
    return storedStreak ? (parseInt(storedStreak, 10) || 0) : 0;
  });
  const [lastCompletedDate, setLastCompletedDate] = useState(() => {
    return localStorage.getItem('meds_tracker_completed_date') || '';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const storedSound = localStorage.getItem('meds_tracker_sound');
    return storedSound !== null ? storedSound === 'true' : true;
  });

  // UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'taken'
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Form States
  const [formName, setFormName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formColor, setFormColor] = useState('indigo'); // indigo, emerald, rose, amber, violet, sky, teal, fuchsia
  const [formDosesRequired, setFormDosesRequired] = useState(1);

  // Current time display for the widget header
  const [currentTime, setCurrentTime] = useState(new Date());

  // Confetti / Completion pop state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);

  // Color mappings
  const colorMap = {
    indigo: {
      card: 'card-indigo',
      dot: 'bg-indigo-500',
      text: 'text-indigo-300'
    },
    emerald: {
      card: 'card-emerald',
      dot: 'bg-emerald-500',
      text: 'text-emerald-300'
    },
    rose: {
      card: 'card-rose',
      dot: 'bg-rose-500',
      text: 'text-rose-300'
    },
    amber: {
      card: 'card-amber',
      dot: 'bg-amber-500',
      text: 'text-amber-300'
    },
    violet: {
      card: 'card-violet',
      dot: 'bg-violet-500',
      text: 'text-violet-300'
    },
    sky: {
      card: 'card-sky',
      dot: 'bg-sky-500',
      text: 'text-sky-300'
    },
    teal: {
      card: 'card-teal',
      dot: 'bg-teal-500',
      text: 'text-teal-300'
    },
    fuchsia: {
      card: 'card-fuchsia',
      dot: 'bg-fuchsia-500',
      text: 'text-fuchsia-300'
    }
  };

  // Add platform classes and initialize native status bar
  useEffect(() => {
    if (isTauri) {
      document.documentElement.classList.add('is-tauri');
      document.body.classList.add('is-tauri');
    }
    if (isCapacitor) {
      document.documentElement.classList.add('is-capacitor');
      document.body.classList.add('is-capacitor');
      
      // Initialize StatusBar
      try {
        StatusBar.setStyle({ style: StatusBarStyle.Dark });
        StatusBar.setBackgroundColor({ color: '#0b0f19' });
      } catch (err) {
        console.warn('Failed to configure native StatusBar', err);
      }
    }
  }, []);

  // Android hardware back button handler
  useEffect(() => {
    if (!isCapacitor) return;
    
    let listenerHandle;
    
    AppPlugin.addListener('backButton', () => {
      if (isAddOpen) {
        setIsAddOpen(false);
      } else if (editingMed) {
        setEditingMed(null);
      } else {
        AppPlugin.exitApp();
      }
    }).then(handle => {
      listenerHandle = handle;
    });
    
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isAddOpen, editingMed]);

  // Sync clock helper
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save changes to LocalStorage helper
  const saveMedications = (updatedMeds) => {
    setMedications(updatedMeds);
    localStorage.setItem('meds_tracker_list', JSON.stringify(updatedMeds));
  };

  // Core Midnight Reset Check Logic
  const checkAndResetMidnight = useCallback(() => {
    const todayStr = getLocalDateString();
    const storedResetDate = localStorage.getItem('meds_tracker_last_reset') || lastResetDate;

    if (storedResetDate && storedResetDate !== todayStr) {
      // 1. Fetch current meds to review yesterday's compliance before resetting
      const storedMeds = JSON.parse(localStorage.getItem('meds_tracker_list') || '[]');
      
      let streakCompletedDate = localStorage.getItem('meds_tracker_completed_date') || '';
      const yesterdayStr = getYesterdayDateString();

      // If yesterday they completed everything, their streak survives.
      // If yesterday they did NOT complete everything, but they had completed it on a prior date, we must check.
      // Basically, if streakCompletedDate is NOT yesterday, the streak resets to 0.
      if (streakCompletedDate !== yesterdayStr && streakCompletedDate !== todayStr) {
        localStorage.setItem('meds_tracker_streak', '0');
        setStreak(0);
      }

      // 2. Perform reset of medication toggles
      const resetMeds = storedMeds.map(med => ({
        ...med,
        taken: false,
        dosesTaken: 0,
        lastTakenDate: null
      }));

      // Update LocalStorage
      localStorage.setItem('meds_tracker_list', JSON.stringify(resetMeds));
      localStorage.setItem('meds_tracker_last_reset', todayStr);
      
      setMedications(resetMeds);
      setLastResetDate(todayStr);

      console.log(`[PWA Auto-Reset] Midnight reset performed at ${new Date().toLocaleTimeString()}. Stored reset date updated to ${todayStr}.`);
    }
  }, [lastResetDate]);

  // Periodically check for midnight reset (every 30 seconds + visible transitions + page focus)
  useEffect(() => {
    // Run the check asynchronously on mount to avoid React synchronous setState warning
    const mountTimeout = setTimeout(() => {
      checkAndResetMidnight();
    }, 0);

    const interval = setInterval(checkAndResetMidnight, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndResetMidnight();
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkAndResetMidnight);

    return () => {
      clearTimeout(mountTimeout);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkAndResetMidnight);
    };
  }, [checkAndResetMidnight]);

  // Audio completion indicator (delightful soft chime using Web Audio API)
  const playChime = (type = 'success') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (type === 'success') {
        // High, pleasant double chime
        const playTone = (freq, start, duration) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          
          gainNode.gain.setValueAtTime(0.15, start);
          gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.start(start);
          osc.stop(start + duration);
        };
        
        const now = audioCtx.currentTime;
        playTone(523.25, now, 0.15); // C5
        playTone(659.25, now + 0.1, 0.35); // E5
      } else if (type === 'allDone') {
        // Celestial chords (C5 -> E5 -> G5 -> C6)
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gainNode.gain.setValueAtTime(0.1, now + idx * 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio Context failed to play sound', e);
    }
  };

  // Tactile haptic feedback
  const triggerHaptic = async () => {
    if (isCapacitor) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (err) {
        console.warn('Native haptics failed', err);
      }
    } else if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40); // 40ms subtle vibe
    }
  };

  // Drag and drop pointer handlers
  const handleDragStart = (e, index) => {
    if (filter !== 'all') return;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      // Release capture might not be supported in some webviews
    }
    setDraggedIndex(index);
    triggerHaptic();
  };

  const handleDragOver = (index) => {
    if (draggedIndex === null || draggedIndex === index || filter !== 'all') return;
    
    // Swap items in state
    const reorderedMeds = [...medications];
    const temp = reorderedMeds[draggedIndex];
    reorderedMeds[draggedIndex] = reorderedMeds[index];
    reorderedMeds[index] = temp;
    
    setDraggedIndex(index);
    setMedications(reorderedMeds);
  };

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null) {
      setDraggedIndex(null);
      localStorage.setItem('meds_tracker_list', JSON.stringify(medications));
      triggerHaptic();
    }
  }, [draggedIndex, medications]);

  // Global listener for ending drag
  useEffect(() => {
    if (draggedIndex === null) return;
    const handleGlobalPointerUp = () => {
      handleDragEnd();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [draggedIndex, handleDragEnd]);

  // Toggle Dose logic
  const handleToggleDose = (id, index) => {
    triggerHaptic();
    const todayStr = getLocalDateString();
    
    const updatedMeds = medications.map(med => {
      if (med.id === id) {
        let newDosesTaken;
        
        if (index < med.dosesTaken) {
          // Clicked a completed dose -> set taken count to that index (unmarking it and all subsequent)
          newDosesTaken = index;
        } else {
          // Clicked an uncompleted dose -> set taken count up to that dose (index + 1)
          newDosesTaken = index + 1;
          playChime('success');
        }
        
        const willBeFullyTaken = newDosesTaken === med.dosesRequired;
        
        return {
          ...med,
          dosesTaken: newDosesTaken,
          taken: willBeFullyTaken,
          lastTakenDate: newDosesTaken > 0 ? todayStr : null
        };
      }
      return med;
    });

    saveMedications(updatedMeds);

    // Dynamic Streak Progression Calculation
    const totalCount = updatedMeds.length;
    const takenCount = updatedMeds.filter(m => m.taken).length;
    
    if (totalCount > 0 && takenCount === totalCount) {
      // User has completed all medications for today!
      const yesterdayStr = getYesterdayDateString();
      let newStreak = streak;

      if (lastCompletedDate === yesterdayStr) {
        // Streak continues!
        newStreak = streak + 1;
      } else if (lastCompletedDate === todayStr) {
        // Already completed today, do not double-increment
      } else {
        // Streak restarted
        newStreak = 1;
      }

      setStreak(newStreak);
      setLastCompletedDate(todayStr);
      localStorage.setItem('meds_tracker_streak', String(newStreak));
      localStorage.setItem('meds_tracker_completed_date', todayStr);
      
      // Play celestial completion sound
      setTimeout(() => {
        playChime('allDone');
        setShowCompletionOverlay(true);
      }, 300);
    } else {
      // If they completed today but then untoggled a medicine
      if (lastCompletedDate === todayStr) {
        // Revert completion
        setLastCompletedDate('');
        localStorage.removeItem('meds_tracker_completed_date');
        
        // Decrement streak if they broke today's completion
        const revertedStreak = Math.max(0, streak - 1);
        setStreak(revertedStreak);
        localStorage.setItem('meds_tracker_streak', String(revertedStreak));
      }
    }
  };

  // Add Medication
  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newMed = {
      id: Date.now().toString(),
      name: formName.trim(),
      dosage: formDosage.trim() || 'As needed',
      time: formTime.trim() || 'Anytime',
      color: formColor,
      dosesRequired: formDosesRequired,
      dosesTaken: 0,
      taken: false,
      lastTakenDate: null
    };

    const updatedMeds = [...medications, newMed];
    saveMedications(updatedMeds);
    
    // Close & reset form
    setIsAddOpen(false);
    setFormName('');
    setFormDosage('');
    setFormTime('');
    setFormColor('indigo');
    setFormDosesRequired(1);
    triggerHaptic();

    // Reset completion status for today if new medication is added (needs to be taken too)
    const todayStr = getLocalDateString();
    if (lastCompletedDate === todayStr) {
      setLastCompletedDate('');
      localStorage.removeItem('meds_tracker_completed_date');
      const revertedStreak = Math.max(0, streak - 1);
      setStreak(revertedStreak);
      localStorage.setItem('meds_tracker_streak', String(revertedStreak));
    }
  };

  // Edit Medication Submission
  const handleEditMedication = (e) => {
    e.preventDefault();
    if (!formName.trim() || !editingMed) return;

    const updatedMeds = medications.map(med => {
      if (med.id === editingMed.id) {
        const clampedDosesTaken = Math.min(med.dosesTaken, formDosesRequired);
        return {
          ...med,
          name: formName.trim(),
          dosage: formDosage.trim() || 'As needed',
          time: formTime.trim() || 'Anytime',
          color: formColor,
          dosesRequired: formDosesRequired,
          dosesTaken: clampedDosesTaken,
          taken: clampedDosesTaken === formDosesRequired
        };
      }
      return med;
    });

    saveMedications(updatedMeds);
    setEditingMed(null);
    setFormName('');
    setFormDosage('');
    setFormTime('');
    setFormColor('indigo');
    setFormDosesRequired(1);
    triggerHaptic();
  };

  // Trigger Edit Mode
  const startEdit = (med) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormDosage(med.dosage);
    setFormTime(med.time);
    setFormColor(med.color);
    setFormDosesRequired(med.dosesRequired || 1);
    setIsAddOpen(true);
  };

  // Delete Medication
  const handleDeleteMedication = (id) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      const updatedMeds = medications.filter(med => med.id !== id);
      saveMedications(updatedMeds);
      triggerHaptic();
      
      // Re-evaluate streak if the only untaken meds were deleted
      const todayStr = getLocalDateString();
      const totalCount = updatedMeds.length;
      const takenCount = updatedMeds.filter(m => m.taken).length;
      
      if (totalCount > 0 && takenCount === totalCount && lastCompletedDate !== todayStr) {
        const yesterdayStr = getYesterdayDateString();
        const newStreak = lastCompletedDate === yesterdayStr ? streak + 1 : 1;
        setStreak(newStreak);
        setLastCompletedDate(todayStr);
        localStorage.setItem('meds_tracker_streak', String(newStreak));
        localStorage.setItem('meds_tracker_completed_date', todayStr);
      }
    }
  };

  // Reset all manually for debugging / testing
  const handleManualReset = () => {
    if (confirm('Manually reset all medications to "Not Taken" for today?')) {
      const resetMeds = medications.map(m => ({ ...m, taken: false, dosesTaken: 0, lastTakenDate: null }));
      saveMedications(resetMeds);
      
      const todayStr = getLocalDateString();
      if (lastCompletedDate === todayStr) {
        setLastCompletedDate('');
        localStorage.removeItem('meds_tracker_completed_date');
        const revertedStreak = Math.max(0, streak - 1);
        setStreak(revertedStreak);
        localStorage.setItem('meds_tracker_streak', String(revertedStreak));
      }
      triggerHaptic();
    }
  };

  // Statistics & Progress calculations
  const totalCount = medications.length;
  const takenCount = medications.filter(m => m.taken).length;
  const completionPercentage = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  
  // Filtered medication list
  const filteredMeds = medications.filter(med => {
    if (filter === 'taken') return med.taken;
    if (filter === 'pending') return !med.taken;
    return true; // 'all'
  });

  return (
    <div className={`w-full mx-auto animate-slide-up ${isTauri || isCapacitor ? 'h-screen p-3 flex flex-col justify-center overflow-hidden' : 'max-w-md p-4 md:p-6'}`}>
      {/* PWA Install / Update Notification Toast */}
      {needRefresh && !isTauri && !isCapacitor && (
        <div className="fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl glass-panel border border-violet-500/30 flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-semibold text-slate-200">New update available!</span>
          </div>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold transition-all"
          >
            Update
          </button>
        </div>
      )}

      {/* Completion Overlay Alert */}
      {showCompletionOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
          <div className="p-8 rounded-3xl glass-panel max-w-xs text-center border border-success-500/20 shadow-2xl animate-scale-up">
            <div className="w-20 h-20 bg-success-500/10 border border-success-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Flame className="w-10 h-10 text-success-500 fill-success-500/40" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2">All Done Today!</h3>
            <p className="text-sm text-slate-400 mb-6">
              You have taken all your medications. Streak increased to <span className="font-bold text-amber-400">{streak}</span>!
            </p>
            <button 
              onClick={() => setShowCompletionOverlay(false)}
              className="w-full py-3 rounded-2xl bg-success-600 hover:bg-success-500 text-white font-bold transition-all shadow-lg shadow-success-600/30"
            >
              Awesome
            </button>
          </div>
        </div>
      )}

      {/* Main Widget Card */}
      <div className={`rounded-3xl glass-panel overflow-hidden border border-slate-800 shadow-2xl flex flex-col ${isTauri || isCapacitor ? 'h-full' : ''}`}>
        {isTauri && (
          <div 
            data-tauri-drag-region
            className="h-9 flex items-center justify-between px-5 bg-slate-950/40 border-b border-slate-800/40 text-slate-400 select-none cursor-default flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-4xs font-bold uppercase tracking-wider text-slate-400">Medication Tracker Widget</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleMinimize}
                className="p-1 rounded hover:bg-slate-800/80 hover:text-slate-200 transition-all cursor-pointer"
                title="Minimize"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button 
                onClick={handleClose}
                className="p-1 rounded hover:bg-rose-950/60 hover:text-rose-400 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        {/* Widget Header */}
        <div className="px-5 pt-5 pb-5 bg-gradient-to-b from-indigo-950/40 to-slate-900/40 border-b border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Medication</span>
                <span className="text-slate-400 font-light">Tracker</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                <span className="text-slate-600">•</span>
                <Clock className="w-3.5 h-3.5" />
                {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Utility buttons */}
            <div className="flex gap-1.5">
              <button 
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  localStorage.setItem('meds_tracker_sound', String(!soundEnabled));
                }}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleManualReset}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset daily states manually"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Statistics Banner */}
          <div className="grid grid-cols-5 gap-3 mt-5 items-center">
            {/* Progress Circle Visual */}
            <div className="col-span-2 flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative w-11 h-11 flex-shrink-0">
                <svg className="w-full h-full">
                  <circle className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="transparent" r="18" cx="22" cy="22"/>
                  <circle 
                    className="text-indigo-500 progress-ring-circle" 
                    strokeWidth="3.5" 
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 * (1 - completionPercentage / 100)}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="18" 
                    cx="22" 
                    cy="22"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xs font-bold text-indigo-300">
                  {completionPercentage}%
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-300">{takenCount}/{totalCount}</p>
                <p className="text-4xs text-slate-500 font-bold uppercase tracking-wider">Taken</p>
              </div>
            </div>

            {/* Streak Panel */}
            <div className="col-span-3 flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${streak > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'} transition-all`}>
                  <Flame className={`w-5 h-5 ${streak > 0 ? 'fill-amber-500/20' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{streak} Days</p>
                  <p className="text-4xs text-slate-500 font-bold uppercase tracking-wider">Active Streak</p>
                </div>
              </div>
              {streak > 0 && (
                <div className="px-2 py-0.5 text-4xs font-bold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/10 animate-pulse">
                  STREAKING
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        {totalCount > 0 && (
          <div className="px-5 py-3 bg-slate-900/20 flex gap-2 border-b border-slate-800/80">
            {['all', 'pending', 'taken'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === type 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Medications List Area */}
        <div className={`px-5 py-5 flex-1 overflow-y-auto min-h-[220px] ${isTauri || isCapacitor ? 'max-h-none' : 'max-h-[360px]'}`}>
          {filteredMeds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-slate-800/80 flex items-center justify-center mb-4 text-slate-500">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-300">
                {medications.length === 0 ? "No Medications Added" : "No items match filter"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                {medications.length === 0 
                  ? "Tap the button below to add your first dose tracker." 
                  : "Try checking other filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeds.map((med) => {
                const originalIndex = medications.findIndex(m => m.id === med.id);
                const isDragging = draggedIndex === originalIndex;
                const colorConfig = colorMap[med.color] || colorMap.indigo;

                return (
                  <div 
                    key={med.id} 
                    onPointerEnter={() => handleDragOver(originalIndex)}
                    className={`p-3.5 pl-3 rounded-2xl flex items-center justify-between border glass-card transition-all ${
                      med.taken ? 'opacity-50' : ''
                    } ${isDragging ? 'opacity-40 border-indigo-500/50 scale-[0.98]' : ''} ${colorConfig.card}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {filter === 'all' && (
                        <div
                          onPointerDown={(e) => handleDragStart(e, originalIndex)}
                          className={`p-1 -ml-1 text-slate-500 hover:text-slate-300 transition-colors cursor-grab select-none touch-none flex-shrink-0 ${
                            isDragging ? 'cursor-grabbing text-indigo-400' : ''
                          }`}
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}

                      <div className="text-left pl-1 min-w-0 flex-1">
                        <h4 className={`text-sm font-bold truncate transition-all ${
                          med.taken ? 'text-slate-400 line-through' : 'text-slate-200'
                        }`} title={med.name}>
                          {med.name}
                        </h4>
                        <p className="text-3xs text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                          <span className="whitespace-nowrap">{med.dosage}</span>
                          <span className="flex-shrink-0">•</span>
                          <span className="flex items-center gap-0.5 text-slate-400 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {med.time}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions Column (Toggle switch & Edit/Delete on Hover/Click) */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {/* Compact Custom Toggle pill button row */}
                      <div className="flex gap-1 items-center justify-end">
                        {Array.from({ length: med.dosesRequired || 1 }).map((_, idx) => {
                          const isDoseTaken = idx < med.dosesTaken;
                          const isMultiDose = (med.dosesRequired || 1) > 1;
                          const sizeClass = isMultiDose ? 'w-8 h-4' : 'w-12 h-6';
                          const checkIconSize = isMultiDose ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => handleToggleDose(med.id, idx)}
                              className={`relative ${sizeClass} safe-touch cursor-pointer flex-shrink-0`}
                              title={isDoseTaken ? `Dose ${idx + 1}: Mark as not taken` : `Dose ${idx + 1}: Mark as taken`}
                            >
                              <div className={`w-full h-full rounded-full flex border border-slate-700/50 overflow-hidden transition-all duration-300 pointer-events-none ${
                                isDoseTaken ? 'rotate-180 scale-105 border-emerald-500/30' : 'rotate-0'
                              }`}>
                                {/* Left half of capsule */}
                                <span className={`w-1/2 h-full transition-colors duration-300 ${
                                  isDoseTaken ? 'bg-emerald-500' : 'bg-slate-600'
                                }`} />
                                
                                {/* Right half of capsule */}
                                <span className={`w-1/2 h-full transition-colors duration-300 ${
                                  isDoseTaken ? 'bg-slate-100' : 'bg-slate-400'
                                }`} />

                                {/* Dividing band in the middle */}
                                <span className="absolute inset-y-0 left-1/2 w-[1px] -ml-[0.5px] bg-slate-900/40" />

                                {/* Checkmark indicator overlay */}
                                {isDoseTaken && (
                                  <span className="absolute inset-0 flex items-center justify-center text-slate-900 drop-shadow-sm pointer-events-none -rotate-180">
                                    <Check className={`${checkIconSize} stroke-[3.5px] text-emerald-950`} />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Tiny Edit/Delete */}
                      <div className="flex items-center gap-0.5 -mr-1">
                        <button 
                          onClick={() => startEdit(med)}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800/40"
                          title="Edit details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMedication(med.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800/40"
                          title="Delete medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area with Add Button */}
        <div className="p-5 bg-gradient-to-t from-slate-900/60 to-transparent border-t border-slate-900 flex justify-center">
          <button
            onClick={() => {
              setEditingMed(null);
              setIsAddOpen(true);
              triggerHaptic();
            }}
            className="w-full max-w-[200px] py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>
      </div>

      {/* Slide-Up Drawer for Add / Edit Medication */}
      {isAddOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300">
          <div className="w-full max-w-md bg-slate-900 rounded-t-3xl border-t border-slate-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-100">
                {editingMed ? 'Edit Medication' : 'Add Medication'}
              </h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingMed ? handleEditMedication : handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lisinopril, Vitamin D"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 10mg, 1 pill"
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Schedule Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 8:00 AM, Bedtime"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Doses per Day</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormDosesRequired(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        formDosesRequired === num
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      {num} {num === 1 ? 'Dose' : 'Doses'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-2">Visual Color Theme</label>
                <div className="flex flex-wrap gap-2.5">
                  {Object.keys(colorMap).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                        colorMap[color]?.dot || 'bg-indigo-500'
                      } ${formColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'}`}
                      title={color.charAt(0).toUpperCase() + color.slice(1)}
                    >
                      {formColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {editingMed ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
