'use client';
import { useState, useEffect } from "react";
import { Box, Stack, Button, Typography, AppBar, Toolbar, Paper, CssBaseline, TextField } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SignIn, useUser, useClerk } from '@clerk/nextjs';

// Create a dark theme with a custom top panel style
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // A bright blue color for the top panel
    },
    secondary: {
      main: '#ff4081', // Pink color for secondary elements
    },
    background: {
      default: '#121212',
      paper: '#1d1d1d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#bbbbbb',
    },
  },
  typography: {
    button: {
      fontSize: '1rem', // Make the button text larger
      fontWeight: 'bold', // Make the button text bold
      textTransform: 'none', // Disable uppercase transformation
    },
  },
});

export default function Home() {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [messages, setMessages] = useState([
    {
      "role": "assistant",
      content:
        "Hi! I'm the GMU Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState('');

  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (user) {
      setShowSignIn(false);
      setShowLandingPage(true);  // Always show the landing page first when user signs in
      setShowChatInterface(false);
    }
  }, [user]);

  const handleStartClick = () => {
    if (user) {
      setShowLandingPage(false);
      setShowSignIn(false);
      setShowChatInterface(true);
    } else {
      setShowSignIn(true);
    }
  };

  const handleSignOut = () => {
    signOut().then(() => {
      setShowChatInterface(false);
      setShowSignIn(true);  // Redirect to sign-in page after sign-out
    });
  };

  const sendMessage = async () => {
    if (message.trim() === '') {
      return; // Exit the function if the message is empty
    }
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '' }
    ]);

    setMessage('');
    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, { role: "user", content: message }])
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = '';
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };

  if (showSignIn) {
    // Sign-In Page
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AppBar position="static" sx={{ backgroundColor: darkTheme.palette.primary.main, height: '56px' }}>
            <Toolbar sx={{ minHeight: '56px', justifyContent: 'space-between' }}>
              <Typography
                variant="h6"
                sx={{
                  flexGrow: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                }}
              >
                GMU Rate My Professor
              </Typography>
              <Button 
                color="inherit" 
                onClick={() => { setShowSignIn(false); setShowLandingPage(true); }} 
                sx={{ fontSize: '1rem' }}
              >
                Back to Welcome
              </Button>
            </Toolbar>
          </AppBar>

          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
            }}
          >
            {user ?  (
              <>
                <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}>
                  You are already signed in. Click Start to continue.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartClick}
                  style={{ padding: '10px 0' }}
                >
                  Start
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}>
                  Sign In
                </Typography>
                <Box sx={{ width: '100%', maxWidth: '400px', mx: 'auto' }}>
                  <SignIn />
                </Box>
              </>
            )}
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (showLandingPage) {
    // Landing Page
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          width="100vw"
          height="100vh"
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          bgcolor="background.default"
          color="text.primary"
          sx={{
            backgroundImage: 'url("/gmu2.png")', // Replace with the path to your image
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Paper
            elevation={3}
            style={{
              padding: '40px',
              backgroundColor: '#1d1d1d',
              borderRadius: '8px',
              textAlign: 'center',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <Typography variant="h4" gutterBottom>
              Welcome to GMU Rate My Professor (CS Dept)
            </Typography>
            <Typography variant="body1" gutterBottom>
              This application helps you find professors based on your specific needs. Note: All reviews and data are fictional and for demonstration purposes only. Click the button below to get started.
            </Typography>
            <Stack spacing={3} marginTop={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartClick}
                style={{ padding: '10px 0' }}
              >
                Start
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => { setShowLandingPage(false); setShowSignIn(true); }}
                style={{ padding: '10px 0' }}
              >
                Sign In
              </Button>
            </Stack>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  if (showChatInterface) {
    // Chat Interface Page
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          width="100vw"
          height="100vh"
          display="flex"
          flexDirection="column"
          bgcolor="background.default"
          color="text.primary"
        >
          {/* Top Panel */}
          <AppBar position="fixed" color="primary" sx={{ padding: '6px 12px', height: '56px', top: 0, left: 0, right: 0 }}>
            <Toolbar sx={{ minHeight: '56px', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'left', fontSize: '1.25rem' }}>
                Welcome {user ? user.firstName : "User"}
              </Typography>
              <Button 
                color="inherit" 
                onClick={() => setShowLandingPage(true)} 
                sx={{ fontSize: '1rem' }}
              >
                Back to Welcome
              </Button>
              <Button 
                color="inherit" 
                onClick={handleSignOut} 
                sx={{ fontSize: '1rem' }}
              >
                Sign Out
              </Button>
            </Toolbar>
          </AppBar>

          {/* Chat Interface */}
          <Box sx={{ marginTop: '56px', padding: '20px', flexGrow: 1 }}>
            <Paper 
              elevation={3} 
              style={{
                width: '100%',
                maxWidth: '500px',
                height: '700px',
                padding: '20px',
                backgroundColor: '#1d1d1d',
                borderRadius: '8px',
                color: '#ffffff',
                display: 'flex', // Make the Paper a flex container
                flexDirection: 'column', // Arrange children in a column
                overflow: 'hidden', // Prevent overflow issues
                margin: '0 auto', // Center the chat interface
              }}
            >
              <Stack
                direction="column"
                spacing={2}
                flexGrow={1}
                overflow='auto'
              >
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent={
                      message.role === "assistant" ? "flex-start" : 'flex-end'
                    }
                  >
                    <Box
                      bgcolor={
                        message.role === 'assistant' ? "primary.main" : "secondary.main"
                      }
                      color="white"
                      borderRadius={16}
                      p={3}
                    >
                      <span dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
              <Stack
                direction="row"
                spacing={2}
                marginTop="20px"
              >
                <TextField
                  label="Message"
                  fullWidth
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }}
                  InputLabelProps={{ style: { color: '#bbbbbb' } }}
                  InputProps={{ style: { color: '#ffffff' } }}
                  variant="outlined"
                  style={{ backgroundColor: '#333333', borderRadius: '8px' }}
                />
                <Button 
                  variant='contained' 
                  onClick={sendMessage} 
                  color="primary"
                  style={{ height: '56px' }}
                >
                  Send
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return null; // Fallback in case none of the above conditions are met
}

function formatMessageContent(content) {
  return content
    .replace(/(\*\*)(.*?)\1/g, '<strong>$2</strong>') // Bold text
    .replace(/(\n)/g, '<br />') // Line breaks
    .replace(/(1\.\s|\*\s)/g, '<li>') // Lists
    .replace(/<\/strong>\s-\s/g, '</strong><br/><ul><li>') // Bullet points under strong text
    .replace(/(Professor:)\s(.*?)\n/g, '<strong>$1</strong> $2<br/>') // Professor title
    .replace(/(Subject:)\s(.*?)\n/g, '<strong>$1</strong> $2<br/>') // Subject title
    .replace(/(Reviews:)\s(.*?)\n/g, '<strong>$1</strong> $2<br/>') // Reviews title
    .replace(/(\n<\/li>)/g, '</li></ul>'); // Closing lists
}
