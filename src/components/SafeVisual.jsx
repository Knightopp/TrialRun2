import React, { Component } from 'react';

/**
 * SafeVisual isolates visual/decorative components (WebGL, Three.js, Canvas)
 * so that any unexpected render or runtime exception only falls back to a CSS
 * presentation without bringing down the enclosing page or interactive forms.
 */
export default class SafeVisual extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('SafeVisual caught a visual component error and recovered gracefully:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback !== undefined ? this.props.fallback : null;
    }
    return this.props.children;
  }
}
