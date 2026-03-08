import { useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import type { ApiError, CoachingSessionDetail } from '../api'

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<CoachingSessionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      if (!id) {
        setError('Missing session id.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await api.sessions.getById(id)
        if (isMounted) {
          setSession(data)
        }
      } catch (loadError) {
        const apiError = loadError as ApiError
        if (isMounted) {
          setError(apiError.message || 'Failed to load session.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      isMounted = false
    }
  }, [id])

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography component="h1" variant="h4">
            Session Dashboard
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Stack>

        {isLoading ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading session...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : session ? (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h5">{session.title}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Status:
                  </Typography>
                  <Chip label={formatStatusLabel(session.status)} size="small" />
                </Stack>
                <Typography color="text.secondary" variant="body2">
                  Session ID: {session.id}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">No session data available.</Alert>
        )}
      </Stack>
    </Container>
  )
}

export default DashboardPage
