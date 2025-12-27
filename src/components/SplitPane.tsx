import { createSignal, onMount, For, Show, JSX } from 'solid-js';
import './SplitPane.css';

interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  minSize?: number;
  defaultSize?: number;
  children: JSX.Element[];
}

const SplitPane = (props: SplitPaneProps) => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [size, setSize] = createSignal(props.defaultSize || 50);
  
  let containerRef: HTMLDivElement | undefined;
  let startPos = 0;
  let startSize = 0;

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    startPos = props.direction === 'horizontal' ? e.clientX : e.clientY;
    startSize = size();
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    
    const currentPos = props.direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    const containerSize = props.direction === 'horizontal' 
      ? containerRef.offsetWidth 
      : containerRef.offsetHeight;
    
    const newSize = Math.max(
      props.minSize || 20,
      Math.min(80, startSize + (delta / containerSize) * 100)
    );
    
    setSize(newSize);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={containerRef!}
      class={`split-pane ${props.direction || 'horizontal'}`}
      classList={{ 'dragging': isDragging() }}
    >
      <div 
        class="pane" 
        style={{ 
          [props.direction === 'vertical' ? 'height' : 'width']: `${size()}%` 
        }}
      >
        {props.children[0]}
      </div>
      
      <div 
        class="resizer" 
        onMouseDown={handleMouseDown}
      />
      
      <div 
        class="pane" 
        style={{ 
          [props.direction === 'vertical' ? 'height' : 'width']: `${100 - size()}%` 
        }}
      >
        {props.children[1]}
      </div>
    </div>
  );
};

export default SplitPane;