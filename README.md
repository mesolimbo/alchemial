# ⚗️ Alchemial 🧪️

An interactive elemental alchemy game built with React and Python. Combine basic elements to discover new compounds through creative transmutation!

## Features

- **Drag & Drop Interface**: Intuitive element manipulation
- **AI-Powered Combinations**: Uses Claude AI to generate creative element combinations
- **Visual Feedback**: Magical sound effects and animations
- **Progressive Discovery**: Build complex elements from basic Fire, Water, Earth, and Air
- **Search System**: Find and summon previously discovered elements
- **Alchemical Theme**: Beautiful mystical UI with authentic alchemical symbols

## Tech Stack

### Client
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Tone.js** for audio effects
- **Bun** for fast bundling and package management

### Server
- **Python 3.13** with Flask
- **CGI deployment** compatible with shared hosting
- **Anthropic Claude API** for creative element generation
- **Pipenv** for dependency management

## Development Setup

### Prerequisites
- Node.js and npm
- Bun package manager
- Python 3.13+
- Pipenv

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alchemial
   ```

2. **Install client dependencies**
   ```bash
   cd client
   bun install
   cd ..
   ```

3. **Install server dependencies**
   ```bash
   pipenv install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your:
   # - ANTHROPIC_API_KEY
   # - PYTHON_PATH (for deployment)
   ```

### Development Commands

```bash
# Run development client
npm run dev:client

# Build for production
npm run build

# Run original npm version (legacy)
npm run dev
```

## Deployment

The project is designed for deployment on shared hosting providers that support Python CGI.

### Build Process

```bash
npm run build
```

This creates a `dist/` directory with:
- `index.html` - Main application
- `bundle.js` - Minified client code
- `bundle.css` - Compiled styles
- `server/api.py` - Python CGI endpoint
- `.htaccess` - Apache routing configuration
- `Pipfile` - Python dependencies
- `.env` - Environment variables

### Deployment Steps

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Upload `dist/` contents to your web root**

3. **Set up Python environment on server**
   ```bash
   pipenv install
   ```

4. **Configure environment**
   - Copy `.env` to server
   - Set correct file permissions:
     - `api.py`: 755 (executable)
     - `.env`: 640 (secure)

5. **Test the deployment**
   - Visit your site to see the game
   - Test API endpoint functionality

## Project Structure

```
alchemial/
├── client/                 # React frontend
│   ├── src/
│   │   ├── ElementalAlchemy.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Python backend
│   ├── src/
│   │   ├── api.py         # Main CGI script
│   └── Pipfile
├── npm/                   # Legacy npm version
├── dist/                  # Build output (generated)
├── build.sh              # Build script
├── .env.example          # Environment template
└── package.json          # Main project config
```

## Game Mechanics

### Basic Elements
- 🜂 **Fire** - Heat and energy
- 🜄 **Water** - Flow and life
- 🜃 **Earth** - Stability and growth  
- 🜁 **Air** - Movement and change

### Interactions
- **Drag elements** to move them around the workspace
- **Overlap elements** to combine them into new compounds
- **Double-click** to create copies of elements
- **Search** to summon previously discovered elements
- **Drag to trash** to remove unwanted elements

### Discovery System
The AI creates logical and creative combinations based on:
- Element properties and relationships
- Generation levels (basic → complex)
- Cultural and scientific references
- Wordplay and creative associations

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - Your Claude API key for element generation
- `PYTHON_PATH` - Path to your pipenv Python executable (for deployment)

### Customization

The game can be customized by modifying:
- **Element prompts** in `ElementalAlchemy.tsx`
- **Visual styling** in CSS classes
- **Sound effects** in the Tone.js configuration
- **API endpoints** in the server configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Apache 2.0 License

## Troubleshooting

### Common Issues

**"Unexpected token '<'" error**: Static files not loading properly
- Check `.htaccess` configuration
- Verify file permissions
- Ensure proper MIME types

**CGI 500 errors**: Python script issues
- Check server error logs
- Verify Python path in shebang
- Ensure all dependencies are installed
- Check file permissions (755 for .py files)

**API not responding**: Environment or dependency issues  
- Verify `ANTHROPIC_API_KEY` is set
- Check pipenv environment is activated

### Development Tips

- Use browser developer tools to debug client issues
- Check server logs for CGI script errors  
- Test API endpoints with curl for debugging
