import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Fade,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import api, { API_BASE_URL } from '../api'
import type {
  Annotation,
  ApiError,
  ChatMessage,
  CoachingSessionDetail,
  SessionStatus,
} from '../api'

const TERMINAL_STATUSES: SessionStatus[] = ['ready', 'failed', 'coach_failed']
const TIMELINE_VISIBLE_STATUSES: SessionStatus[] = ['ml_ready', 'processing_coach', 'ready', 'coach_failed']
const LIVE_NOTES_STATUSES: SessionStatus[] = ['processing_ml', 'ml_ready', 'processing_coach', 'coach_failed']
const FALLBACK_LIVE_NOTES = [
  'Opening pace is fast; likely adrenaline spike in first 20 seconds.',
  'Filler words are clustering around transitions ("um", "so", "like").',
  'Eye contact drops briefly when referencing remembered bullet points.',
  'Delivery improves after first key point; cadence becomes more natural.',
  'Hands pause at waist for long stretches; invite a few purposeful gestures.',
  'Clarity is strongest when examples are concrete and story-driven.',
  'Posture stays upright with occasional shoulder tension during tough claims.',
  'Vocal emphasis on numbers is clear; less emphasis on conclusions.',
  'Pauses before major points improve listener comprehension noticeably.',
  'Closing section regains confidence and stronger camera connection.',
]

type LeftPanelTab = 'coach' | 'chat'

type ChatUiMessage = ChatMessage & {
  reasoning?: string
  reasoningCollapsed?: boolean
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatChatTimestamp(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function shouldShowTimeline(status: SessionStatus): boolean {
  return TIMELINE_VISIBLE_STATUSES.includes(status)
}

function shouldShowLiveNotes(status: SessionStatus): boolean {
  return LIVE_NOTES_STATUSES.includes(status)
}

function CoachPanelContent({
  session,
  liveNotes,
  isLive,
  onRetry,
  isRetrying,
  retryError,
  showReadyTransition,
}: {
  session: CoachingSessionDetail
  liveNotes: string[]
  isLive: boolean
  onRetry: () => void
  isRetrying: boolean
  retryError: string | null
  showReadyTransition: boolean
}) {
  if (session.status === 'ready') {
    return (
      <Stack spacing={2}>
        <Fade in={showReadyTransition} timeout={600}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: 1,
              bgcolor: 'success.50',
              border: '1px solid',
              borderColor: 'success.200',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="caption" color="success.dark">
              Analysis complete
            </Typography>
          </Stack>
        </Fade>

        <Typography variant="h6">Coach Review</Typography>
        {/* TODO: wire when backend adds coach_progress endpoint */}
        <Alert severity="info">Coach review sections are unavailable until coach_progress is added to the backend response.</Alert>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'info.main',
            animation: 'pulse 1.4s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 0.25, transform: 'scale(0.9)' },
              '50%': { opacity: 1, transform: 'scale(1.05)' },
              '100%': { opacity: 0.25, transform: 'scale(0.9)' },
            },
          }}
        />
        <Typography variant="subtitle1">Gemini is taking notes...</Typography>
      </Stack>

      {session.status === 'coach_failed' && (
        <Alert
          severity="warning"
          action={
            <Button size="small" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          }
        >
          Coach review unavailable.
        </Alert>
      )}

      {retryError && <Alert severity="error">{retryError}</Alert>}

      <Box
        sx={{
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'grey.800',
          bgcolor: '#101317',
          color: '#b7c0cb',
          minHeight: 260,
          maxHeight: 380,
          overflowY: 'auto',
          px: 1.5,
          py: 1.25,
          fontFamily: '"IBM Plex Mono", "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {liveNotes.length === 0 ? (
          <Typography component="div" sx={{ color: '#8f99a7', fontFamily: 'inherit', fontSize: 'inherit' }}>
            Waiting for live notes...
          </Typography>
        ) : (
          liveNotes.map((line, index) => (
            <Typography key={`${line}-${index}`} component="div" sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: '#b7c0cb' }}>
              {line}
            </Typography>
          ))
        )}

        <Box component="span" sx={{ display: 'inline-flex', ml: 0.5, verticalAlign: 'middle' }}>
          <Box
            component="span"
            sx={{
              width: 8,
              height: 16,
              bgcolor: '#c6ced8',
              opacity: isLive ? 1 : 0.4,
              animation: isLive ? 'cursorBlink 1s steps(1, end) infinite' : 'none',
              '@keyframes cursorBlink': {
                '0%, 49%': { opacity: 1 },
                '50%, 100%': { opacity: 0 },
              },
            }}
          />
        </Box>
      </Box>
    </Stack>
  )
}

function ChatPanel({ sessionId, sessionStatus }: { sessionId: string; sessionStatus: SessionStatus }) {
  const [chatMessages, setChatMessages] = useState<ChatUiMessage[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [streamingReasoning, setStreamingReasoning] = useState('')
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [streamingReasoningCollapsed, setStreamingReasoningCollapsed] = useState(false)

  const isLocked = sessionStatus !== 'ready'

  useEffect(() => {
    let isMounted = true

    const loadChatHistory = async () => {
      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const history = await api.chat.getHistory(sessionId)
        if (isMounted) {
          setChatMessages(history)
        }
      } catch (historyLoadError) {
        const apiError = historyLoadError as ApiError
        if (isMounted) {
          setHistoryError(apiError.message || 'Failed to load chat history.')
        }
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false)
        }
      }
    }

    void loadChatHistory()

    return () => {
      isMounted = false
    }
  }, [sessionId])

  const toggleMessageReasoning = (messageId: string) => {
    setChatMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reasoningCollapsed: !(message.reasoningCollapsed ?? true),
            }
          : message,
      ),
    )
  }

  const handleSendMessage = async () => {
    if (isLocked || isSending) {
      return
    }

    const trimmedMessage = draftMessage.trim()
    if (!trimmedMessage) {
      return
    }

    const userMessage: ChatUiMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      created_at: new Date().toISOString(),
    }

    setChatMessages((previous) => [...previous, userMessage])
    setDraftMessage('')
    setSendError(null)
    setIsSending(true)
    setStreamingReasoning('')
    setStreamingAnswer('')
    setStreamingReasoningCollapsed(false)

    let reasoningBuffer = ''
    let answerBuffer = ''

    try {
      const response = await api.chat.sendMessage(sessionId, trimmedMessage)

      await api.chat.streamResponse(sessionId, response.response_id, {
        onReasoningToken: (token) => {
          reasoningBuffer += token
          setStreamingReasoning((previous) => previous + token)
        },
        onAnswerToken: (token) => {
          answerBuffer += token
          setStreamingAnswer((previous) => previous + token)
        },
        onError: (message) => {
          setSendError(message)
        },
      })

      const assistantMessage: ChatUiMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: answerBuffer.trim() || 'No final answer generated.',
        created_at: new Date().toISOString(),
        reasoning: reasoningBuffer.trim() || undefined,
        reasoningCollapsed: true,
      }

      setChatMessages((previous) => [...previous, assistantMessage])
      setStreamingReasoning('')
      setStreamingAnswer('')
      setStreamingReasoningCollapsed(true)
    } catch (sendMessageError) {
      const apiError = sendMessageError as ApiError
      setSendError(apiError.message || 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  const showStreamingAssistant = isSending && (streamingReasoning.length > 0 || streamingAnswer.length > 0)

  return (
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      {isLocked && <Alert severity="info">Chat unlocks when analysis is complete.</Alert>}
      {historyError && <Alert severity="warning">{historyError}</Alert>}
      {sendError && <Alert severity="error">{sendError}</Alert>}

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          p: 1.25,
          minHeight: 260,
          maxHeight: 320,
          overflowY: 'auto',
          bgcolor: 'grey.50',
        }}
      >
        {isHistoryLoading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading chat history...
            </Typography>
          </Stack>
        ) : chatMessages.length === 0 && !showStreamingAssistant ? (
          <Typography variant="body2" color="text.secondary">
            No messages yet.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {chatMessages.map((message) => {
              const isAssistant = message.role === 'assistant'

              return (
                <Card
                  key={message.id}
                  variant="outlined"
                  sx={{
                    alignSelf: isAssistant ? 'stretch' : 'flex-end',
                    maxWidth: isAssistant ? '100%' : '88%',
                    bgcolor: isAssistant ? 'common.white' : 'primary.50',
                  }}
                >
                  <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack spacing={0.75}>
                      <Typography variant="caption" color="text.secondary">
                        {isAssistant ? 'Coach' : 'You'} • {formatChatTimestamp(message.created_at)}
                      </Typography>

                      {isAssistant && message.reasoning && (
                        <Stack spacing={0.5}>
                          <Button
                            size="small"
                            onClick={() => toggleMessageReasoning(message.id)}
                            sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
                          >
                            {message.reasoningCollapsed ?? true ? 'Show Reasoning…' : 'Hide Reasoning…'}
                          </Button>
                          <Collapse in={!(message.reasoningCollapsed ?? true)}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              {message.reasoning}
                            </Typography>
                          </Collapse>
                        </Stack>
                      )}

                      <Typography variant="body2">{message.content}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}

            {showStreamingAssistant && (
              <Card variant="outlined" sx={{ bgcolor: 'common.white' }}>
                <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      Coach • {formatChatTimestamp(new Date().toISOString())}
                    </Typography>

                    <Stack spacing={0.5}>
                      <Button
                        size="small"
                        onClick={() => setStreamingReasoningCollapsed((previous) => !previous)}
                        sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
                      >
                        {streamingReasoningCollapsed ? 'Show Reasoning…' : 'Hide Reasoning…'}
                      </Button>
                      <Collapse in={!streamingReasoningCollapsed}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          {streamingReasoning || 'Reasoning...'}
                        </Typography>
                      </Collapse>
                    </Stack>

                    <Typography variant="body2">{streamingAnswer || 'Generating final answer...'}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Box>

      <Stack direction="row" spacing={1.25} alignItems="flex-end">
        <TextField
          label="Ask Coach"
          placeholder={isLocked ? 'Chat unlocks when analysis is complete' : 'Ask a follow-up question...'}
          multiline
          maxRows={4}
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
          disabled={isLocked || isSending}
          fullWidth
        />
        <Button variant="contained" onClick={handleSendMessage} disabled={isLocked || isSending || !draftMessage.trim()}>
          {isSending ? 'Sending...' : 'Send'}
        </Button>
      </Stack>
    </Stack>
  )
}

function VideoPlayer({ sessionId }: { sessionId: string }) {
  const streamUrl = `${API_BASE_URL}/api/v1/sessions/${sessionId}/video-stream`

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Video Player</Typography>
          <Box
            sx={{
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'common.black',
            }}
          >
            <video controls style={{ width: '100%', display: 'block' }} preload="metadata">
              {/* TODO: real endpoint - GET /api/v1/sessions/:id/video-stream */}
              <source src={streamUrl} type="video/mp4" />
            </video>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Native controls provide play/pause and timeline scrubbing in this placeholder phase.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

function AnnotationTimeline({
  status,
  annotations,
  timelineError,
}: {
  status: SessionStatus
  annotations: Annotation[]
  timelineError: string | null
}) {
  if (!shouldShowTimeline(status)) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1}>
            <Typography variant="h6">Annotation Timeline</Typography>
            <Typography variant="body2" color="text.secondary">
              Timeline is hidden until status reaches ml_ready.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const audioTrack = annotations.filter((annotation) => annotation.source === 'audio')
  const videoTrack = annotations.filter((annotation) => annotation.source === 'video')
  const maxEndMs = Math.max(1, ...annotations.map((annotation) => annotation.end_ms))

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Annotation Timeline</Typography>
          {timelineError && <Alert severity="warning">{timelineError}</Alert>}

          {annotations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No annotations available yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <TimelineTrack label="Audio" color="info.main" annotations={audioTrack} maxEndMs={maxEndMs} />
              <TimelineTrack label="Video" color="secondary.main" annotations={videoTrack} maxEndMs={maxEndMs} />
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function TimelineTrack({
  label,
  color,
  annotations,
  maxEndMs,
}: {
  label: string
  color: string
  annotations: Annotation[]
  maxEndMs: number
}) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          0:00 - {formatTimestamp(maxEndMs)}
        </Typography>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          height: 44,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.100',
          overflow: 'hidden',
        }}
      >
        <Divider sx={{ position: 'absolute', insetX: 0, top: '50%' }} />
        {annotations.map((annotation) => {
          const position = Math.min(100, Math.max(0, (annotation.start_ms / maxEndMs) * 100))

          return (
            <Tooltip
              key={annotation.id}
              title={`${formatTimestamp(annotation.start_ms)} • ${annotation.summary}`}
              placement="top"
              arrow
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: `${position}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: color,
                  border: '2px solid',
                  borderColor: 'common.white',
                  boxShadow: 1,
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          )
        })}
      </Box>
    </Stack>
  )
}

function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<CoachingSessionDetail | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [liveNoteSource, setLiveNoteSource] = useState<string[]>([])
  const [displayedLiveNotes, setDisplayedLiveNotes] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)

  const [isRetryingCoach, setIsRetryingCoach] = useState(false)
  const [pollRestartKey, setPollRestartKey] = useState(0)
  const [forceCoachFailedPolling, setForceCoachFailedPolling] = useState(false)

  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('coach')
  const [showReadyTransition, setShowReadyTransition] = useState(false)
  const previousStatus = useRef<SessionStatus | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    let isMounted = true

    const loadLiveNotes = async () => {
      try {
        const notes = await api.sessions.getLiveNotes(id)
        if (isMounted) {
          setLiveNoteSource(notes)
        }
      } catch {
        if (isMounted) {
          setLiveNoteSource([])
        }
      }
    }

    void loadLiveNotes()

    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    setDisplayedLiveNotes([])
  }, [id])

  useEffect(() => {
    if (!session) {
      return
    }

    if (session.status === 'ready') {
      setDisplayedLiveNotes([])
      return
    }

    if (!shouldShowLiveNotes(session.status)) {
      return
    }

    const source = liveNoteSource.length > 0 ? liveNoteSource : FALLBACK_LIVE_NOTES

    const intervalId = setInterval(() => {
      setDisplayedLiveNotes((previous) => {
        if (previous.length >= source.length) {
          return previous
        }

        return [...previous, source[previous.length]]
      })
    }, 800)

    return () => {
      clearInterval(intervalId)
    }
  }, [liveNoteSource, session])

  useEffect(() => {
    if (!session) {
      return
    }

    if (previousStatus.current !== 'ready' && session.status === 'ready') {
      setShowReadyTransition(true)
      const timeoutId = setTimeout(() => {
        setShowReadyTransition(false)
      }, 1200)

      previousStatus.current = session.status
      return () => {
        clearTimeout(timeoutId)
      }
    }

    previousStatus.current = session.status
  }, [session])

  useEffect(() => {
    if (!id) {
      setError('Missing session id.')
      setIsLoading(false)
      return
    }

    let isMounted = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const shouldStopPolling = (status: SessionStatus): boolean => {
      if (status === 'coach_failed') {
        return !forceCoachFailedPolling
      }

      return isTerminalStatus(status)
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const loadTimelineIfVisible = async (status: SessionStatus) => {
      if (!shouldShowTimeline(status)) {
        if (isMounted) {
          setAnnotations([])
          setTimelineError(null)
        }
        return
      }

      try {
        const timelineData = await api.sessions.getTimeline(id)
        if (isMounted) {
          setAnnotations(timelineData)
          setTimelineError(null)
        }
      } catch (timelineLoadError) {
        const apiError = timelineLoadError as ApiError
        if (isMounted) {
          setTimelineError(apiError.message || 'Failed to load timeline.')
        }
      }
    }

    const loadSession = async (initialLoad: boolean): Promise<SessionStatus | null> => {
      if (initialLoad && isMounted) {
        setIsLoading(true)
      }

      try {
        const sessionData = await api.sessions.getById(id)
        if (!isMounted) {
          return null
        }

        setSession(sessionData)
        setError(null)
        await loadTimelineIfVisible(sessionData.status)
        return sessionData.status
      } catch (loadError) {
        const apiError = loadError as ApiError
        if (isMounted) {
          setError(apiError.message || 'Failed to load session.')
        }
        return null
      } finally {
        if (initialLoad && isMounted) {
          setIsLoading(false)
        }
      }
    }

    const startPolling = async () => {
      const initialStatus = await loadSession(true)
      if (!isMounted || !initialStatus || shouldStopPolling(initialStatus)) {
        return
      }

      intervalId = setInterval(() => {
        void loadSession(false).then((status) => {
          if (!status) {
            return
          }

          if (forceCoachFailedPolling && status !== 'coach_failed') {
            setForceCoachFailedPolling(false)
          }

          if (shouldStopPolling(status)) {
            stopPolling()
          }
        })
      }, 3000)
    }

    void startPolling()

    return () => {
      isMounted = false
      stopPolling()
    }
  }, [forceCoachFailedPolling, id, pollRestartKey])

  const handleRetryCoach = async () => {
    if (!session) {
      return
    }

    setIsRetryingCoach(true)
    setRetryError(null)

    try {
      await api.sessions.startAnalysis(session.id)
      setForceCoachFailedPolling(true)
      setPollRestartKey((previous) => previous + 1)
    } catch (retryRequestError) {
      const apiError = retryRequestError as ApiError
      setRetryError(apiError.message || 'Failed to retry analysis.')
    } finally {
      setIsRetryingCoach(false)
    }
  }

  const currentLiveNotes = displayedLiveNotes.length > 0 ? displayedLiveNotes : []

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography component="h1" variant="h4">
              {session?.title || 'Session Dashboard'}
            </Typography>
            {session && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Session ID: {session.id}
                </Typography>
                <Chip size="small" label={formatStatusLabel(session.status)} />
              </Stack>
            )}
          </Stack>
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
        ) : !session ? (
          <Alert severity="info">No session data available.</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' },
              gridTemplateAreas: {
                xs: '"left" "video" "timeline"',
                lg: '"left video" "timeline timeline"',
              },
            }}
          >
            <Box sx={{ gridArea: 'left' }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Tabs
                      value={leftPanelTab}
                      onChange={(_, nextTab: LeftPanelTab) => setLeftPanelTab(nextTab)}
                      variant="fullWidth"
                      sx={{ minHeight: 40 }}
                    >
                      <Tab label="Coach" value="coach" />
                      <Tab label="Chat" value="chat" />
                    </Tabs>

                    {leftPanelTab === 'coach' ? (
                      <CoachPanelContent
                        session={session}
                        liveNotes={currentLiveNotes}
                        isLive={shouldShowLiveNotes(session.status)}
                        onRetry={handleRetryCoach}
                        isRetrying={isRetryingCoach}
                        retryError={retryError}
                        showReadyTransition={showReadyTransition}
                      />
                    ) : (
                      <ChatPanel sessionId={session.id} sessionStatus={session.status} />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ gridArea: 'video' }}>
              <VideoPlayer sessionId={session.id} />
            </Box>

            <Box sx={{ gridArea: 'timeline' }}>
              <AnnotationTimeline status={session.status} annotations={annotations} timelineError={timelineError} />
            </Box>
          </Box>
        )}
      </Stack>
    </Container>
  )
}

export default DashboardPage
