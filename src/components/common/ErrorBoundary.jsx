import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full mb-4">!</div>
          <h2 className="text-lg font-semibold mb-2">אופס, משהו השתבש</h2>
          <p className="text-sm text-gray-600 mb-4">נתקלנו בשגיאה בזמן טעינת הצ'אט. נסו לרענן את הדף או לחזור מאוחר יותר.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md"
          >
            נסו שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}