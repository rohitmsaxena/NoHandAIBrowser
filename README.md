# AI Browser - Electron-based Web Browser with Tab Management

## Project Overview

This project is an Electron-based web browser application that utilizes React and TypeScript to create a modern browsing experience. The browser is designed with a focus on modularity and maintainability, allowing for easy extension and customization.

## Key Features

- **Tab Management**: Create, close, and switch between multiple browser tabs
- **Navigation Controls**: Standard browser navigation including back, forward, and URL entry
- **Modern Architecture**: Built using Electron, React, TypeScript, and Vite
- **Modular Design**: Organized into logical components for easy maintenance and extension

## Technical Architecture

The application is built with a clean separation of concerns:

### Main Process (Electron)

- **Window Management**: Handles the creation and lifecycle of the main application window
- **Tab Management**: Controls the creation, activation, and closing of browser tabs
- **Navigation**: Manages URL navigation, history, and loading states
- **IPC Communication**: Facilitates secure communication between main and renderer processes

### Renderer Process (React)

- **Tab Bar UI**: Displays and manages tabs with proper visual feedback
- **Navigation Bar**: Provides URL input and navigation controls
- **Content Display**: Renders web content in isolated webviews

## Code Organization

The project follows a modular structure:

```
src/
├── main.ts                  # Main Electron entry point
├── constants/
│   └── appConstants.ts      # Application-wide constants
├── types/
│   └── browserTypes.ts      # TypeScript interfaces and types
├── managers/
│   ├── windowManager.ts     # Window creation and management
│   ├── tabManager.ts        # Tab state and operations
│   └── navigationManager.ts # Browser navigation functionality
└── ipc/
    └── ipcHandler.ts        # Inter-process communication
```

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI library for building component-based interfaces
- **TypeScript**: Typed JavaScript for improved developer experience
- **Vite**: Next-generation frontend build tool
- **Electron Forge**: Complete toolchain for building Electron applications

## Future Extensions

This browser implementation can serve as a foundation for:

- Adding extensions/plugin support
- Implementing advanced privacy features
- Creating a platform for running offline AI agents
- Building custom browser automation tools
- Developing specialized browsing experiences for specific use cases

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nohandsaibrowser.git

# Install dependencies
cd nohandsaibrowser
npm install

# Start the development server
npm start

# Package the application
npm run package

# Create distribution packages
npm run make
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.