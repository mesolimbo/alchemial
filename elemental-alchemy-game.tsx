import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

/// <reference types="./vite-env.d.ts" />

// Type definitions
interface Ingredient {
  name: string;
  emoji: string;
}

interface Pill {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  ancestry: Ingredient[];
  generation: number;
}

interface CombinationRecipe {
  name: string;
  emoji: string;
  ancestry: Ingredient[];
  generation: number;
}

interface RecentCombination {
  ingredients: Ingredient[];
  result: { name: string; emoji: string };
  failed: boolean;
}

interface DragState {
  isDragging: boolean;
  animationId: number | null;
  pill?: Pill;
  offset?: { x: number; y: number };
  lastMousePos?: { x: number; y: number };
}

const ElementalAlchemy = () => {
  const [pills, setPills] = useState<Pill[]>([]);
  
  const [discoveredElements, setDiscoveredElements] = useState<Set<string>>(new Set([
    'Fire', 'Water', 'Earth', 'Air'
  ]));
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedPill, setSelectedPill] = useState<Pill | null>(null);
  const [recentCombination, setRecentCombination] = useState<RecentCombination | null>(null);
  const [draggedPill, setDraggedPill] = useState<Pill | null>(null);
  const [isTrashHovered, setIsTrashHovered] = useState<boolean>(false);
  const [combinations, setCombinations] = useState<Map<string, CombinationRecipe>>(new Map());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingPair, setGeneratingPair] = useState<string | null>(null);
  const [nextId, setNextId] = useState<number>(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({ isDragging: false, animationId: null });
  const trashHoveredRef = useRef<boolean>(false);
  const draggedPillRef = useRef<Pill | null>(null);
  const pillsRef = useRef<Pill[]>(pills);
  const isGeneratingRef = useRef<boolean>(false);

  // Keep refs in sync with state
  pillsRef.current = pills;
  draggedPillRef.current = draggedPill;
  isGeneratingRef.current = isGenerating;

  // Calculate initial positions based on container size
  const getInitialPills = (): Pill[] => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      // Fallback positions if container not ready
      return [
        { id: 'fire-1', name: 'Fire', emoji: '🜂', x: 480, y: 20, ancestry: [], generation: 0 },
        { id: 'water-1', name: 'Water', emoji: '🜄', x: 480, y: 380, ancestry: [], generation: 0 },
        { id: 'earth-1', name: 'Earth', emoji: '🜃', x: 20, y: 380, ancestry: [], generation: 0 },
        { id: 'air-1', name: 'Air', emoji: '🜁', x: 20, y: 20, ancestry: [], generation: 0 }
      ];
    }
    
    const containerWidth = containerRect.width - 32; // Account for padding
    const containerHeight = containerRect.height - 32;
    const margin = 20; // Distance from edges
    const estimatedPillWidth = 35; // Move right elements 15px closer to edge
    
    return [
      { id: 'fire-1', name: 'Fire', emoji: '🜂', x: containerWidth - margin - estimatedPillWidth, y: margin, ancestry: [], generation: 0 },
      { id: 'water-1', name: 'Water', emoji: '🜄', x: containerWidth - margin - estimatedPillWidth - 5, y: containerHeight - 30 - margin, ancestry: [], generation: 0 },
      { id: 'earth-1', name: 'Earth', emoji: '🜃', x: margin, y: containerHeight - 30 - margin, ancestry: [], generation: 0 },
      { id: 'air-1', name: 'Air', emoji: '🜁', x: margin, y: margin, ancestry: [], generation: 0 }
    ];
  };

  // Create magical sound effect
  const playMagicalSound = async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      const gain = new Tone.Gain(0.15).toDestination();
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 }
      }).connect(gain);

      const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 });
      synth.connect(reverb);
      reverb.connect(gain);

      const now = Tone.now();
      synth.triggerAttackRelease("C6", "8n", now);
      synth.triggerAttackRelease("E6", "8n", now + 0.05);
      synth.triggerAttackRelease("G6", "8n", now + 0.1);
      synth.triggerAttackRelease("C7", "8n", now + 0.15);

      setTimeout(() => {
        synth.dispose();
        reverb.dispose();
        gain.dispose();
      }, 2000);
    } catch (error) {
      console.log("Audio not available");
    }
  };

  // Normalize element names for consistent recipe tracking
  const normalizeElementName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w]/g, '') // Remove all non-alphanumeric characters (including emojis and spaces)
      .trim();
  };

  const generateCombination = async (pill1: Pill, pill2: Pill, existingElements: string[] = []): Promise<Pill> => {
    // All variables declared at function scope
    const pill1Gen = pill1.generation || 0;
    const pill2Gen = pill2.generation || 0;
    const maxGeneration = Math.max(pill1Gen, pill2Gen);
    const minGeneration = Math.min(pill1Gen, pill2Gen);
    const newGeneration = maxGeneration + 1;

    // Normalize the avoidance list to prevent similar names
    const normalizedExisting = existingElements.map(name => normalizeElementName(name));
    const uniqueNormalizedExisting = [...new Set(normalizedExisting)]; // Remove duplicates
    const avoidList = uniqueNormalizedExisting.length > 0 ? `\nAvoid anything that normalizes to: ${uniqueNormalizedExisting.join(', ')}` : '';

    // Determine creativity level based on generation mix
    let creativityLevel = "moderate";
    let stabilityNote = "";
    
    if (minGeneration === 0) {
        creativityLevel = minGeneration === maxGeneration ? "logical" : "creative";
        stabilityNote = maxGeneration === 0 ? "both are basic elements" : "basic element provides stability";
    } else if (minGeneration <= 1) {
        creativityLevel = "creative";
        stabilityNote = "early-generation elements allow creative combinations";
    } else {
        creativityLevel = "wild";
        stabilityNote = "high-generation elements create unexpected results";
    }

    setIsGenerating(true);
    setGeneratingPair(`${pill1.name} + ${pill2.name} ⚗️`);

    try {
        // Single optimized prompt for Claude Haiku 3.5
        const prompt = `Combine by free assiciation: ${pill1.name} + ${pill2.name}

Combination guidelines:
- Prefer shorter common, recognizable phrases:
    - animals, plants, objects, places, pop culture, history, mythology, science, arts, celebrities, humanities, food, etc.
- Avoid technical jargon unless widely known
- New elements should be somewhat different from the source elements so we get more diversity of ideas over time
- ${stabilityNote}
- Names: 1-6 words max
- Choose fitting emoji
- Be creative so we get more diversity over subsequent generations

JSON only:
{"name":"Element Text","emoji":"🔮"}`;

        console.log("Making API request with prompt:", prompt);
        
        const response = await fetch("http://localhost:3001/api/generate", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });

        console.log("Response status:", response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error:", errorText);
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);
        let responseText = data.content[0].text.trim();
        console.log("Raw response text:", responseText);
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        console.log("Cleaned response text:", responseText);
        
        // Try to find and fix JSON in the response
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
          console.log("Extracted JSON:", responseText);
        }
        
        // If JSON looks incomplete, try to fix it
        if (!responseText.includes('"emoji"') || !responseText.endsWith('}')) {
          console.log("JSON appears incomplete, attempting to fix");
          // Try to extract just name and add a default emoji
          const nameMatch = responseText.match(/"name"\s*:\s*"([^"]+)"/);
          if (nameMatch) {
            responseText = `{"name":"${nameMatch[1]}","emoji":"✨"}`;
            console.log("Fixed JSON:", responseText);
          }
        }
        
        const result = JSON.parse(responseText);

        const newPill = {
            id: `${pill1.name}+${pill2.name}-${nextId}`,
            name: result.name,
            emoji: result.emoji,
            x: (pill1.x + pill2.x) / 2,
            y: (pill1.y + pill2.y) / 2,
            ancestry: [
                { name: pill1.name, emoji: pill1.emoji },
                { name: pill2.name, emoji: pill2.emoji }
            ],
            generation: newGeneration
        };

        setDiscoveredElements(prev => new Set([...prev, result.name]));
        setNextId(prev => prev + 1);
        
        console.log(`🔍 Generated new pill: ${result.name}, storing in combinations...`);
        return newPill;

    } catch (error) {
        console.error("Error generating combination:", error);

        const fallbackNames = [`${pill1.name}${pill2.name}`, `Mixed ${pill1.name}`, `Hybrid`];
        const fallbackName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
        const fallbackEmojis = ['⚗️', '🌟', '✨', '💫', '🔮'];

        const newPill = {
            id: `${fallbackName}-${nextId}`,
            name: fallbackName,
            emoji: fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)],
            x: (pill1.x + pill2.x) / 2,
            y: (pill1.y + pill2.y) / 2,
            ancestry: [
                { name: pill1.name, emoji: pill1.emoji },
                { name: pill2.name, emoji: pill2.emoji }
            ],
            generation: newGeneration
        };

        setNextId(prev => prev + 1);
        return newPill;

    } finally {
        setIsGenerating(false);
        setGeneratingPair(null);
    }
  };

  const getCombination = async (pill1: Pill, pill2: Pill, existingElementNames: string[] = []): Promise<Pill> => {
    // Use normalized names for recipe keys to prevent duplicates
    const norm1 = normalizeElementName(pill1.name);
    const norm2 = normalizeElementName(pill2.name);

    // Create normalized keys (always in alphabetical order for consistency)
    const sortedNorms = [norm1, norm2].sort();
    const normalizedKey = `${sortedNorms[0]}+${sortedNorms[1]}`;

    // Check cache using normalized key
    let cachedResult = null;
    if (combinations.has(normalizedKey)) {
        cachedResult = combinations.get(normalizedKey);
    }

    // Check if this element already exists using normalized names
    const normalizedExistingNames = existingElementNames.map(name => normalizeElementName(name));
    const elementAlreadyExists = cachedResult && normalizedExistingNames.includes(normalizeElementName(cachedResult.name));

    if (cachedResult && !elementAlreadyExists) {
        return {
            id: `${cachedResult.name}-${nextId}`,
            name: cachedResult.name,
            emoji: cachedResult.emoji,
            x: (pill1.x + pill2.x) / 2,
            y: (pill1.y + pill2.y) / 2,
            ancestry: cachedResult.ancestry,
            generation: cachedResult.generation
        };
    }

    const newPill = await generateCombination(pill1, pill2, existingElementNames);

    // Double-check the new pill doesn't conflict with existing normalized names
    const newPillNormalized = normalizeElementName(newPill.name);
    if (normalizedExistingNames.includes(newPillNormalized)) {
        // Generate an alternative since this name already exists
        const newPillAlt = await generateCombination(pill1, pill2, [...existingElementNames, newPill.name]);

        // Cache using normalized key but store the alternative result
        if (!combinations.has(normalizedKey)) {
            const newCombinations = new Map(combinations);
            newCombinations.set(normalizedKey, {
                name: newPillAlt.name,
                emoji: newPillAlt.emoji,
                ancestry: newPillAlt.ancestry,
                generation: newPillAlt.generation
            });
            setCombinations(newCombinations);
        }

        return newPillAlt;
    }

    // Cache using normalized key but store original result
    if (!combinations.has(normalizedKey)) {
        const newCombinations = new Map(combinations);
        newCombinations.set(normalizedKey, {
            name: newPill.name,
            emoji: newPill.emoji,
            ancestry: newPill.ancestry,
            generation: newPill.generation
        });
        setCombinations(newCombinations);
    }

    return newPill;
  };

  const createCopy = (originalPill: Pill): void => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const containerWidth = containerRect ? containerRect.width - 16 : 500; // Account for padding
    const containerHeight = containerRect ? containerRect.height - 16 : 400;
    
    // Calculate copy position based on original position
    let newX = originalPill.x + 80;
    let newY = originalPill.y + 40;
    
    // If copy would go off the right edge, place it to the left instead
    if (newX + 100 > containerWidth) {
      newX = originalPill.x - 80;
    }
    
    // If copy would go off the bottom edge, place it above instead
    if (newY + 30 > containerHeight) {
      newY = originalPill.y - 40;
    }
    
    // Ensure copy doesn't go off the left or top edges
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    
    const newPill = {
      ...originalPill,
      id: `${originalPill.name}-${nextId}`,
      x: newX,
      y: newY,
      ancestry: originalPill.ancestry || [],
      generation: originalPill.generation || 0
    };
    setNextId(prev => prev + 1);
    setPills(prev => [...prev, newPill]);
  };

  const spawnFromSearch = (elementName: string): void => {
    console.log(`🔍 spawnFromSearch called with: "${elementName}"`);
    const baseElements: Record<string, string> = { 'Fire': '🜂', 'Water': '🜄', 'Earth': '🜃', 'Air': '🜁' };
    let elementData: { name: string; emoji: string; ancestry?: Ingredient[]; generation?: number } | null = null;

    console.log(`🔍 Checking if "${elementName}" is a base element...`);
    if (baseElements[elementName]) {
        console.log(`✅ Found base element: ${elementName} -> ${baseElements[elementName]}`);
        elementData = { name: elementName, emoji: baseElements[elementName], ancestry: [], generation: 0 };
    } else {
        console.log(`🔍 Searching combinations for "${elementName}"...`);
        console.log(`🔍 Available combinations:`, Array.from(combinations.keys()));
        
        // Look through combinations for matching element
        for (const [, value] of combinations) {
            console.log(`🔍 Checking combination: "${value.name}"`);
            if (value.name === elementName) {
                console.log(`✅ Found combination: ${elementName}`);
                elementData = value;
                break;
            }
        }
        
        // If not found in combinations, check if it exists in current pills (fallback)
        if (!elementData) {
            console.log(`🔍 Not found in combinations, checking current pills...`);
            const existingPill = pillsRef.current.find(p => p.name === elementName);
            if (existingPill) {
                console.log(`✅ Found element in current pills: ${elementName}`);
                elementData = {
                    name: existingPill.name,
                    emoji: existingPill.emoji,
                    ancestry: existingPill.ancestry,
                    generation: existingPill.generation
                };
            } else {
                console.log(`🔍 Not found in pills either, checking if this was a previously generated element...`);
                // Check if this element name appears in any combination key (it was a source element)
                for (const [key, value] of combinations) {
                    const keyParts = key.split('+');
                    console.log(`🔍 Checking key parts: ${keyParts}`);
                    // If the element name appears in a key, we can infer it was generated before
                    if (keyParts.some(part => part === normalizeElementName(elementName))) {
                        console.log(`✅ Found ${elementName} as a source in combination key: ${key}`);
                        // Use the result from that combination as a template, but with the original name
                        elementData = {
                            name: elementName,
                            emoji: value.emoji,
                            ancestry: value.ancestry,
                            generation: Math.max(0, (value.generation || 1) - 1)
                        };
                        break;
                    }
                }
            }
        }
    }

    console.log(`🔍 elementData result:`, elementData);
    if (elementData) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const centerX = containerRect ? containerRect.width / 2 - 50 : 200;
        const centerY = containerRect ? containerRect.height / 2 - 20 : 200;

        let ancestry: Ingredient[] = [];
        if (!baseElements[elementName] && elementData.ancestry) {
            ancestry = elementData.ancestry;
        }

        const newPill: Pill = {
            id: `${elementName}-${nextId}`,
            name: elementData.name,
            emoji: elementData.emoji,
            x: centerX + Math.random() * 100 - 50,
            y: centerY + Math.random() * 100 - 50,
            ancestry: ancestry,
            generation: elementData.generation || (baseElements[elementName] ? 0 : Math.max(1, ancestry.length))
        };

        console.log(`🔍 Creating new pill:`, newPill);
        setSelectedPill(newPill);
        setRecentCombination(null);
        setNextId(prev => prev + 1);
        setPills(prev => {
            console.log(`🔍 Adding pill to existing pills. Current count: ${prev.length}`);
            const newPills = [...prev, newPill];
            console.log(`🔍 New pills array length: ${newPills.length}`);
            return newPills;
        });
        
        // Use setTimeout to ensure state updates complete before clearing search
        setTimeout(() => {
            setSearchTerm('');
            setSearchResults([]);
        }, 0);
        
        console.log(`✅ Successfully spawned ${elementName}`);
    } else {
        console.log(`❌ Could not find element data for "${elementName}"`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(e.target.value);
    
    if (term.length > 0) {
      const filtered = Array.from(discoveredElements)
        .filter(element => element.toLowerCase().includes(term))
        .slice(0, 8);
      console.log(`🔍 Search results for "${term}":`, filtered);
      console.log(`🔍 Discovered elements:`, Array.from(discoveredElements));
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent, pill: Pill): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating) {
      createCopy(pill);
    }
  };

  const handlePillClick = (e: React.MouseEvent, pill: Pill): void => {
    e.stopPropagation();
    if (!dragStateRef.current.isDragging) {
      setSelectedPill(pill);
      setRecentCombination(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, pill: Pill): void => {
    if (isGenerating) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    dragStateRef.current.isDragging = true;
    dragStateRef.current.pill = pill;
    dragStateRef.current.offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDraggedPill(pill);
    e.preventDefault();
    e.stopPropagation();
  };

  const updateDragPosition = (mouseX: number, mouseY: number): void => {
    if (!dragStateRef.current.isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = mouseX - containerRect.left - (dragStateRef.current.offset?.x || 0);
    const newY = mouseY - containerRect.top - (dragStateRef.current.offset?.y || 0);
    
    const boundedX = Math.max(0, Math.min(containerRect.width - 70, newX));
    const boundedY = Math.max(0, Math.min(containerRect.height - 30, newY));
    
    setPills(prev => prev.map(p => 
      p.id === dragStateRef.current.pill?.id 
        ? { ...p, x: boundedX, y: boundedY }
        : p
    ));
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!dragStateRef.current.isDragging || isGeneratingRef.current) return;
    
    dragStateRef.current.lastMousePos = { x: e.clientX, y: e.clientY };
    
    if (dragStateRef.current.animationId) {
      cancelAnimationFrame(dragStateRef.current.animationId);
    }
    
    dragStateRef.current.animationId = requestAnimationFrame(() => {
      updateDragPosition(e.clientX, e.clientY);
      
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;
        const trashCenterX = containerRect.width / 2;
        const trashCenterY = containerRect.height - 16 - 24; // bottom-4 (16px) + half height (24px)
        const trashSize = 60; // Make it larger for easier detection
        
        const isOverTrash = 
          relativeX >= trashCenterX - trashSize/2 && 
          relativeX <= trashCenterX + trashSize/2 &&
          relativeY >= trashCenterY - trashSize/2 && 
          relativeY <= trashCenterY + trashSize/2;
        
        // Update ref immediately and force re-render if changed
        if (trashHoveredRef.current !== isOverTrash) {
          trashHoveredRef.current = isOverTrash;
          setIsTrashHovered(isOverTrash);
        }
      }
    });
  };

  const handleMouseUp = async (e?: MouseEvent): Promise<void> => {
    if (!dragStateRef.current.isDragging || isGeneratingRef.current || !draggedPillRef.current) return;
    
    // Store the dragged pill reference before we potentially set it to null
    const currentDraggedPill = draggedPillRef.current;
    
    dragStateRef.current.isDragging = false;
    
    if (dragStateRef.current.animationId) {
      cancelAnimationFrame(dragStateRef.current.animationId);
      dragStateRef.current.animationId = null;
    }
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      setDraggedPill(null);
      setIsTrashHovered(false);
      return;
    }
    
    const mouseX = e ? e.clientX : dragStateRef.current.lastMousePos?.x || 0;
    const mouseY = e ? e.clientY : dragStateRef.current.lastMousePos?.y || 0;
    
    const currentX = mouseX - containerRect.left - (dragStateRef.current.offset?.x || 0);
    const currentY = mouseY - containerRect.top - (dragStateRef.current.offset?.y || 0);
    const boundedX = Math.max(0, Math.min(containerRect.width - 70, currentX));
    const boundedY = Math.max(0, Math.min(containerRect.height - 30, currentY));
    
    const movedPill = { ...currentDraggedPill, x: boundedX, y: boundedY };
    
    // Check trash
    const trashCenterX = containerRect.width / 2;
    const trashCenterY = containerRect.height - 16 - 24; // bottom-4 (16px) + half height (24px)
    const trashDistance = Math.sqrt(
      Math.pow(boundedX + 50 - trashCenterX, 2) + Math.pow(boundedY + 15 - trashCenterY, 2)
    );
    
    if (trashDistance < 35) {
      setPills(prev => prev.filter(p => p.id !== currentDraggedPill.id));
      trashHoveredRef.current = false;
      setIsTrashHovered(false);
      setDraggedPill(null);
      return;
    }
    
    // Check collisions
    const currentPills = pillsRef.current.filter(p => p.id !== currentDraggedPill.id);
    let collidingPill = null;
    
    for (const pill of currentPills) {
      const dx = movedPill.x - pill.x;
      const dy = movedPill.y - pill.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 70) {
        collidingPill = pill;
        break;
      }
    }
    
    if (collidingPill) {
      const existingElementNames = pillsRef.current.map(p => p.name);
      const newPill = await getCombination(movedPill, collidingPill, existingElementNames);
      
      playMagicalSound();
      
      setRecentCombination({
        ingredients: [
          { name: movedPill.name, emoji: movedPill.emoji },
          { name: collidingPill.name, emoji: collidingPill.emoji }
        ],
        result: { name: newPill.name, emoji: newPill.emoji },
        failed: false
      });
      setSelectedPill(null);
      
      setPills(prev => {
        const filtered = prev.filter(p => p.id !== movedPill.id && p.id !== collidingPill.id);
        return [...filtered, newPill];
      });
    } else {
      setPills(prev => prev.map(p => 
        p.id === currentDraggedPill.id 
          ? { ...p, x: boundedX, y: boundedY }
          : p
      ));
    }
    
    // Clean up hover state
    trashHoveredRef.current = false;
    setIsTrashHovered(false);
    setDraggedPill(null);
  };

  // Initialize pills after container is mounted
  useEffect(() => {
    if (containerRef.current && pills.length === 0) {
      setPills(getInitialPills());
    }
  }, []);

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpGlobal = (e: MouseEvent) => handleMouseUp(e);
    
    document.addEventListener('mousemove', handleMouseMoveGlobal, { passive: false });
    document.addEventListener('mouseup', handleMouseUpGlobal);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      
      if (dragStateRef.current.animationId) {
        cancelAnimationFrame(dragStateRef.current.animationId);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-4 relative overflow-hidden">
      {/* Alchemical decoration background */}
      <div className="absolute inset-0 opacity-10 text-yellow-600">
        {/* Classical Elements */}
        <div className="absolute top-20 right-20 text-4xl">🜀</div>
        <div className="absolute bottom-20 left-20 text-5xl">🜁</div>
        <div className="absolute bottom-10 right-10 text-4xl">🜂</div>
        <div className="absolute top-1/3 left-10 text-4xl">🜃</div>
        
        {/* Planetary/Metal Symbols */}
        <div className="absolute top-1/2 left-10 text-3xl">☿</div>
        <div className="absolute top-1/3 right-10 text-3xl">♀</div>
        <div className="absolute bottom-1/3 left-1/3 text-4xl">☉</div>
        <div className="absolute top-1/4 right-1/3 text-3xl">☽</div>
        <div className="absolute bottom-1/4 right-1/4 text-3xl">♂</div>
        <div className="absolute top-10 left-1/3 text-3xl">♃</div>
        <div className="absolute bottom-10 left-1/4 text-3xl">♄</div>
        
        {/* Zodiac Symbols */}
        <div className="absolute top-1/4 left-1/4 text-2xl">♈</div>
        <div className="absolute top-3/4 right-1/3 text-2xl">♉</div>
        <div className="absolute top-1/6 right-1/4 text-2xl">♊</div>
        <div className="absolute bottom-1/6 left-1/2 text-2xl">♋</div>
        <div className="absolute top-2/3 left-1/6 text-2xl">♌</div>
        <div className="absolute bottom-1/3 right-1/6 text-2xl">♍</div>
        <div className="absolute top-1/2 right-1/2 text-2xl">♎</div>
        <div className="absolute bottom-2/3 left-2/3 text-2xl">♏</div>
        <div className="absolute top-5/6 right-1/6 text-2xl">♐</div>
        <div className="absolute bottom-1/4 left-1/6 text-2xl">♑</div>
        <div className="absolute top-1/3 left-2/3 text-2xl">♒</div>
        <div className="absolute bottom-1/2 right-2/3 text-2xl">♓</div>
        
        {/* Additional Alchemical Symbols */}
        <div className="absolute top-1/5 left-1/5 text-2xl">🝆</div>
        <div className="absolute bottom-1/5 right-1/5 text-2xl">🝬</div>
        <div className="absolute top-4/5 left-3/5 text-2xl">🝭</div>
        <div className="absolute bottom-3/5 right-3/5 text-2xl">🝮</div>
        <div className="absolute top-2/5 right-4/5 text-2xl">🝯</div>
        <div className="absolute bottom-4/5 left-4/5 text-2xl">🝰</div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-500 bg-clip-text text-transparent">
          ⚗️ Alchemial 🧪️
        </h1>
        <p className="text-center text-yellow-200 mb-3 text-xs italic">
          "As above, so below" - Discover the formulas that bind all elements
        </p>
        
        <div className="relative mb-3 max-w-md mx-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search the grimoire for elements..."
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-gray-800 bg-opacity-80 backdrop-blur-sm text-yellow-100 placeholder-yellow-400 border border-yellow-600/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg mt-1 max-h-32 overflow-y-auto z-50 border border-yellow-600/30">
              {searchResults.map((element, index) => (
                <button
                  key={`${element}-${index}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Clicked search result: ${element} (index: ${index})`);
                    spawnFromSearch(element);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-yellow-600/20 text-yellow-100 border-b border-yellow-600/20 last:border-b-0 transition-colors duration-150 cursor-pointer"
                >
                  {element}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-3 max-w-md mx-auto">
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-lg p-3 border border-yellow-600/50 shadow-lg" style={{ height: '90px' }}>
            {selectedPill ? (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-1 flex items-center space-x-1.5 text-sm">
                    <span className="text-sm">{selectedPill.emoji}</span>
                    <span className="truncate">{selectedPill.name}</span>
                    <span className="text-xs text-yellow-500 opacity-75 flex-shrink-0">Gen {selectedPill.generation || 0}</span>
                  </h3>
                  {selectedPill.ancestry && selectedPill.ancestry.length > 0 ? (
                    <div className="text-yellow-200 text-xs">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="opacity-75 text-yellow-500 text-xs flex-shrink-0">From:</span>
                        <div className="flex items-center space-x-1 flex-wrap">
                          {selectedPill.ancestry.map((ingredient, index) => (
                            <React.Fragment key={index}>
                              <span className="flex items-center space-x-0.5 bg-yellow-600/20 px-1 py-0.5 rounded text-xs">
                                <span className="text-xs">{ingredient.emoji}</span>
                                <span className="text-xs">{ingredient.name}</span>
                              </span>
                              {index < selectedPill.ancestry.length - 1 && (
                                <span className="text-yellow-400 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-yellow-300 text-xs opacity-75">
                      Prima materia - Original essence
                    </div>
                  )}
                </div>
                <div className="text-yellow-400 text-xs opacity-60 mt-1">
                  {selectedPill.generation === 0 ? 'Stabilizes chaos' : `Gen ${selectedPill.generation} - moderates chaos`}
                </div>
              </div>
            ) : recentCombination ? (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-1 flex items-center space-x-1 text-sm">
                    <span>Recent Transmutation</span>
                    <span className="text-xs">⚗️</span>
                  </h3>
                  <div className="text-yellow-200 text-xs space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="opacity-75 text-yellow-500 text-xs flex-shrink-0">Dissolved:</span>
                      <div className="flex items-center space-x-1">
                        {recentCombination.ingredients.map((ingredient, index) => (
                          <React.Fragment key={index}>
                            <span className="flex items-center space-x-0.5 bg-gray-700/50 px-1 py-0.5 rounded text-xs line-through opacity-60">
                              <span className="text-xs">{ingredient.emoji}</span>
                              <span className="text-xs">{ingredient.name}</span>
                            </span>
                            {index < recentCombination.ingredients.length - 1 && (
                              <span className="text-yellow-400 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="opacity-75 text-yellow-500 text-xs flex-shrink-0">Coagulated:</span>
                      <span className="flex items-center space-x-0.5 bg-yellow-600/30 px-1 py-0.5 rounded text-xs">
                        <span className="text-xs">{recentCombination.result.emoji}</span>
                        <span className="text-xs">{recentCombination.result.name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-yellow-500 text-xs opacity-75 text-center italic px-2">
                  "Solve et coagula" - Click elements to reveal their secrets, or combine to witness transmutation
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-yellow-200 text-center text-xs mb-1">
          Drag to move • Overlap to transmute • Double-click to replicate • Click to analyze • Search to summon • Drag to trash to remove
        </p>
        <p className="text-yellow-400 text-center text-xs mb-4 flex items-center justify-center space-x-2">
          <span>⚱️</span>
          <span>{discoveredElements.size} essences discovered</span>
          <span>⚱️</span>
        </p>
        
        {isGenerating && (
          <div className="fixed top-4 right-4 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-2 z-50 border border-yellow-600/50">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
              <span className="text-yellow-200 text-xs">
                ⚗️ Transmuting: {generatingPair}...
              </span>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className="relative bg-gray-900 bg-opacity-60 backdrop-blur-sm rounded-xl p-4 min-h-96 border-2 border-yellow-600/40 shadow-2xl"
          style={{ height: '450px' }}
          onClick={() => {
            setSelectedPill(null);
            setRecentCombination(null);
          }}
        >
          <div className="absolute inset-4 rounded-lg border border-yellow-600/10 opacity-30"></div>
          <div className="absolute inset-8 rounded-full border border-yellow-600/5 opacity-20"></div>
          
          <div
            className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-lg border-2 border-dashed transition-all duration-200 flex items-center justify-center text-2xl cursor-pointer ${isTrashHovered ? 'border-red-500 bg-red-500/40 text-red-200 scale-110 shadow-lg shadow-red-500/30' : 'border-gray-500/50 bg-gray-700/30 text-gray-400 hover:border-gray-400 hover:bg-gray-600/40'}`}
            title="Drag pills here to remove them • Click to reset board"
            tabIndex={-1}
            style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            contentEditable={false}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🗑️ Resetting board...');
              
              // Flash red to show activity
              console.log('🔴 Setting trash to red...');
              trashHoveredRef.current = true;
              setIsTrashHovered(true);
              console.log('🔴 isTrashHovered state set to:', true);
              
              // Clear all drag states completely
              dragStateRef.current = { isDragging: false, animationId: null };
              
              // Force clear all React states (except isTrashHovered which we want to stay red)
              setDraggedPill(null);
              setSelectedPill(null);
              setRecentCombination(null);
              setIsGenerating(false);
              setGeneratingPair(null);
              
              // Cancel any running animations or requests
              if (dragStateRef.current.animationId) {
                cancelAnimationFrame(dragStateRef.current.animationId);
                dragStateRef.current.animationId = null;
              }
              
              // Reset board to initial 4 elements with dynamic positioning
              setTimeout(() => {
                setPills(getInitialPills());
                // Turn off red after a brief flash and ensure all states are clear
                console.log('🔴 Turning trash back to normal...');
                trashHoveredRef.current = false;
                setIsTrashHovered(false);
                console.log('🔴 isTrashHovered state set to:', false);
                
                // Final state cleanup
                setDraggedPill(null);
                setSelectedPill(null);
                setRecentCombination(null);
              }, 300);
              
              console.log('✅ Board reset complete');
            }}
          >
            🗑️
          </div>
          
          
          {pills.map((pill) => (
            <div
              key={pill.id}
              className={`
                absolute bg-gradient-to-r from-yellow-100 to-yellow-50 backdrop-blur-sm rounded-full px-2 py-1
                cursor-grab active:cursor-grabbing transform
                ${draggedPill?.id === pill.id ? 'scale-105 shadow-xl z-10 transition-none opacity-90' : 'transition-all duration-150 opacity-100'}
                ${selectedPill?.id === pill.id ? 'ring-2 ring-yellow-500 ring-opacity-75 shadow-yellow-500/50' : ''}
                hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20
                ${isGenerating ? 'cursor-not-allowed opacity-60' : ''}
                border border-yellow-600/40 hover:border-yellow-500/60
                select-none flex items-center space-x-1 text-sm font-medium
                shadow-md
              `}
              onDoubleClick={(e) => {
                console.log(`Double-click on ${pill.name} (id: ${pill.id})`);
                handleDoubleClick(e, pill);
              }}
              onClick={(e) => {
                console.log(`Click on ${pill.name} (id: ${pill.id}), isDragging: ${dragStateRef.current.isDragging}`);
                handlePillClick(e, pill);
              }}
              onMouseDown={(e) => {
                console.log(`Mouse down on ${pill.name} (id: ${pill.id})`);
                handleMouseDown(e, pill);
              }}
              style={{ 
                left: `${pill.x}px`, 
                top: `${pill.y}px`,
                width: 'max-content'
              }}
            >
              <span className={`text-base leading-none ${
                pill.generation === 0 && pill.name === 'Fire' ? 'text-red-500' :
                pill.generation === 0 && pill.name === 'Water' ? 'text-blue-500' :
                pill.generation === 0 && pill.name === 'Earth' ? 'text-green-500' :
                pill.generation === 0 && pill.name === 'Air' ? 'text-gray-700' : ''
              }`}>{pill.emoji}</span>
              <span className="text-gray-800 whitespace-nowrap leading-none">{pill.name}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-center text-yellow-200">
          <p className="text-xs flex items-center justify-center space-x-2">
            <span>🜊</span>
            <span>Each formula guided by mystical wisdom. Search to recall discovered essences!</span>
            <span>🜊</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ElementalAlchemy;
