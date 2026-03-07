import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, Container, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import api from '../api'
import type { ApiError } from '../api'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await api.auth.login(email, password)
      navigate('/')
    } catch (submitError) {
      const apiError = submitError as ApiError
      setError(apiError.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Log in
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Welcome back to Speech Coach.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              New here?{' '}
              <Link component={RouterLink} to="/signup">
                Create an account
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Container>
  )
}

export default LoginPage
