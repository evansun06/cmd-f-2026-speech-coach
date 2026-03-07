import { Button, Container, Stack, Typography } from '@mui/material'
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography component="h1" variant="h3">
          Speech Coach
        </Typography>
        <Typography color="text.secondary">Home page placeholder.</Typography>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/login" variant="outlined">
            Log in
          </Button>
          <Button component={RouterLink} to="/signup" variant="contained">
            Sign up
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
