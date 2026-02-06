import React from 'react';
import { type ComponentLibrary } from '../../types';

// Basic components using simple HTML elements
// With createRemoteComponentRenderer, remote attributes are passed as props directly
const UIText = React.forwardRef<
  HTMLSpanElement,
  {
    content?: string;
    children?: React.ReactNode;
  }
>(({ content, children, ...props }, ref) => {
  return (
    <span ref={ref} {...props}>
      {content || children}
    </span>
  );
});
UIText.displayName = 'UIText';

const UIButton = React.forwardRef<
  HTMLButtonElement,
  {
    label?: string;
    onPress?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
  }
>(({ label, onPress, onClick, children, ...props }, ref) => {
  // Handle both onPress (from remote press event) and onClick (standard React)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Call onPress if it exists (from remote press event)
    if (onPress) {
      onPress();
    }

    // Call onClick if it exists (standard React handler)
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
      {...props}
    >
      {label || children}
    </button>
  );
});
UIButton.displayName = 'UIButton';

const UIStack = React.forwardRef<
  HTMLDivElement,
  {
    direction?: string;
    spacing?: string;
    align?: string;
    justify?: string;
    children?: React.ReactNode;
  }
>(
  (
    {
      direction = 'vertical',
      spacing = '8',
      align = 'stretch',
      justify = 'flex-start',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: `${spacing}px`,
          alignItems: align,
          justifyContent: justify,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
UIStack.displayName = 'UIStack';

const UIImage = React.forwardRef<
  HTMLImageElement,
  {
    src?: string;
    alt?: string;
    width?: string;
    height?: string;
    children?: React.ReactNode;
  } & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'children'>
>(({ src, alt, width, height, children, ...props }, ref) => {
  // Explicitly ignore children since img elements can't have them
  void children;

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
      {...props}
    />
  );
});
UIImage.displayName = 'UIImage';

export const basicComponentLibrary: ComponentLibrary = {
  name: 'basic',
  elements: [
    {
      tagName: 'ui-text',
      component: UIText,
      propMapping: {
        content: 'content',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-button',
      component: UIButton,
      propMapping: {
        label: 'label',
      },
      eventMapping: {
        press: 'onPress',
      },
    },
    {
      tagName: 'ui-stack',
      component: UIStack,
      propMapping: {
        direction: 'direction',
        spacing: 'spacing',
        align: 'align',
        justify: 'justify',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-image',
      component: UIImage,
      propMapping: {
        src: 'src',
        alt: 'alt',
        width: 'width',
        height: 'height',
      },
      eventMapping: {},
    },
  ],
};
