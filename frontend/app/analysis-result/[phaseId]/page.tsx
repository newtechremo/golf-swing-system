'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

// Mock detailed phase data
const phaseDetailData: Record<number, any> = {
  1: {
    id: 1,
    name: 'Address',
    nameKo: '어드레스',
    image: '/placeholder.svg?key=fqrnp',
    status: 'good',
    description: '볼을 치기 전 준비 자세입니다. 올바른 어드레스는 일관된 스윙의 시작점이 됩니다.',
    keypoints: {
      shoulderTilt: { value: '5도', status: 'good', label: '어깨 기울기' },
      hipRotation: { value: '0도', status: 'good', label: '골반 회전' },
      armAngle: { value: '135도', status: 'good', label: '팔 각도' },
      spineAngle: { value: '35도', status: 'good', label: '척추각' },
    },
    feedback: [
      { type: 'good', text: '어깨선이 정상적으로 정렬되어 있습니다' },
      { type: 'good', text: '골반과 척추각이 이상적입니다' },
      { type: 'good', text: '팔의 위치가 올바릅니다' },
    ],
    improvements: [],
  },
  2: {
    id: 2,
    name: 'Takeaway',
    nameKo: '테이크어웨이',
    image: '/placeholder.svg?key=o13q2',
    status: 'warning',
    description: '백스윙 시작 단계입니다. 클럽을 뒤로 가져가는 초기 동작이 전체 스윙의 방향을 결정합니다.',
    keypoints: {
      shoulderTilt: { value: '12도', status: 'warning', label: '어깨 회전' },
      clubPath: { value: '정상', status: 'good', label: '클럽 경로' },
      armExtension: { value: '양호', status: 'good', label: '팔 펼침' },
      weightShift: { value: '부족', status: 'warning', label: '체중 이동' },
    },
    feedback: [
      { type: 'good', text: '클럽 경로가 정상적입니다' },
      { type: 'good', text: '팔이 잘 펼쳐져 있습니다' },
    ],
    improvements: [
      {
        title: '어깨 회전 개선',
        description: '백스윙 시작 시 어깨를 더 많이 회전시켜주세요. 최소 15도 이상 회전이 필요합니다.',
        tips: ['왼쪽 어깨를 턱 아래로 가져가는 느낌으로 회전', '상체 회전에 집중하되 골반은 안정적으로 유지'],
      },
      {
        title: '체중 이동 강화',
        description: '오른발 쪽으로 체중을 더 확실하게 이동시켜주세요.',
        tips: ['오른쪽 무릎을 고정하고 상체만 회전', '왼발 뒤꿈치가 살짝 들리는 정도가 적당'],
      },
    ],
  },
  3: {
    id: 3,
    name: 'Backswing',
    nameKo: '백스윙',
    image: '/placeholder.svg?key=lyeoq',
    status: 'good',
    description: '클럽을 뒤로 올리는 동작입니다. 충분한 회전과 올바른 팔 각도가 중요합니다.',
    keypoints: {
      shoulderRotation: { value: '85도', status: 'good', label: '어깨 회전' },
      armAngle: { value: '140도', status: 'good', label: '팔 각도' },
      hipRotation: { value: '40도', status: 'good', label: '골반 회전' },
      wristHinge: { value: '양호', status: 'good', label: '손목 코킹' },
    },
    feedback: [
      { type: 'good', text: '어깨와 골반의 회전 비율이 이상적입니다' },
      { type: 'good', text: '팔 각도가 적절합니다' },
      { type: 'good', text: '손목 코킹이 잘 되어있습니다' },
    ],
    improvements: [],
  },
  4: {
    id: 4,
    name: 'Top',
    nameKo: '톱',
    image: '/placeholder.svg?key=unopi',
    status: 'error',
    description: '백스윙의 최고점입니다. 이 자세에서 다운스윙으로 전환이 이루어집니다.',
    keypoints: {
      leftArmPosition: { value: '굽힘', status: 'error', label: '왼팔 위치' },
      shoulderRotation: { value: '95도', status: 'good', label: '어깨 회전' },
      weightDistribution: { value: '60:40', status: 'warning', label: '체중 배분' },
      clubPosition: { value: '정상', status: 'good', label: '클럽 위치' },
    },
    feedback: [
      { type: 'good', text: '어깨 회전이 충분합니다' },
      { type: 'good', text: '클럽이 올바른 위치에 있습니다' },
    ],
    improvements: [
      {
        title: '왼팔 펴기',
        description: '백스윙 탑에서 왼팔이 굽혀져 있습니다. 왼팔을 쭉 펴주면 스윙 아크가 넓어져 비거리가 증가합니다.',
        tips: [
          '백스윙 시 왼팔을 쭉 뻗은 상태로 유지',
          '왼손목이 과도하게 꺾이지 않도록 주의',
          '어깨가 충분히 돌아가면 자연스럽게 팔이 펴짐',
        ],
      },
      {
        title: '체중 이동 개선',
        description: '오른발 쪽으로 체중이 더 이동되어야 합니다. 이상적인 배분은 70:30입니다.',
        tips: ['오른쪽 다리 안쪽에 체중을 느끼도록 연습', '상체가 오른쪽으로 스웨이되지 않도록 주의'],
      },
    ],
  },
  5: {
    id: 5,
    name: 'Downswing',
    nameKo: '다운스윙',
    image: '/placeholder.svg?key=cxce7',
    status: 'warning',
    description: '클럽을 내리치는 동작입니다. 임팩트를 향한 가속이 이루어지는 중요한 단계입니다.',
    keypoints: {
      hipRotation: { value: '빠름', status: 'good', label: '골반 회전' },
      shaftPath: { value: '불안정', status: 'warning', label: '샤프트 경로' },
      weightShift: { value: '양호', status: 'good', label: '체중 이동' },
      armSpeed: { value: '정상', status: 'good', label: '팔 스피드' },
    },
    feedback: [
      { type: 'good', text: '골반 회전 타이밍이 좋습니다' },
      { type: 'good', text: '체중 이동이 잘 되고 있습니다' },
    ],
    improvements: [
      {
        title: '클럽 경로 안정화',
        description: '다운스윙 시 클럽 경로가 다소 불안정합니다. 일관된 경로가 정확도를 높입니다.',
        tips: [
          '하체부터 시작하여 순차적으로 회전',
          '손이 몸 앞을 지나가도록 유지',
          '오른쪽 팔꿈치를 몸에 붙이는 느낌으로 내리기',
        ],
      },
    ],
  },
  6: {
    id: 6,
    name: 'Impact',
    nameKo: '임팩트',
    image: '/placeholder.svg?key=23ve8',
    status: 'good',
    description: '클럽이 볼과 만나는 순간입니다. 가장 중요한 순간으로 모든 동작이 이 순간을 위한 것입니다.',
    keypoints: {
      spineAngle: { value: '유지', status: 'good', label: '척추각' },
      headPosition: { value: '안정', status: 'good', label: '머리 위치' },
      hipRotation: { value: '45도', status: 'good', label: '골반 회전' },
      handPosition: { value: '정상', status: 'good', label: '손 위치' },
    },
    feedback: [
      { type: 'good', text: '척추각이 어드레스 때와 유사하게 유지되었습니다' },
      { type: 'good', text: '머리가 안정적으로 유지되었습니다' },
      { type: 'good', text: '골반 회전이 적절합니다' },
      { type: 'good', text: '손의 위치가 이상적입니다' },
    ],
    improvements: [],
  },
  7: {
    id: 7,
    name: 'Follow-through',
    nameKo: '팔로우스루',
    image: '/placeholder.svg?key=r71x1',
    status: 'good',
    description: '임팩트 이후 클럽을 따라가는 동작입니다. 자연스러운 팔로우스루는 올바른 임팩트의 결과입니다.',
    keypoints: {
      armExtension: { value: '양호', status: 'good', label: '팔 펼침' },
      bodyRotation: { value: '정상', status: 'good', label: '몸 회전' },
      clubPath: { value: '정상', status: 'good', label: '클럽 경로' },
      balance: { value: '안정', status: 'good', label: '균형' },
    },
    feedback: [
      { type: 'good', text: '양팔이 자연스럽게 펴져 있습니다' },
      { type: 'good', text: '몸의 회전이 부드럽습니다' },
      { type: 'good', text: '균형이 잘 유지되고 있습니다' },
    ],
    improvements: [],
  },
  8: {
    id: 8,
    name: 'Finish',
    nameKo: '피니시',
    image: '/placeholder.svg?key=qdo5j',
    status: 'warning',
    description: '스윙의 마지막 자세입니다. 안정적인 피니시는 전체 스윙이 잘 이루어졌음을 보여줍니다.',
    keypoints: {
      bodyRotation: { value: '90도', status: 'good', label: '몸 회전' },
      balance: { value: '불안정', status: 'warning', label: '균형' },
      clubPosition: { value: '정상', status: 'good', label: '클럽 위치' },
      weightTransfer: { value: '85%', status: 'good', label: '체중 이동' },
    },
    feedback: [
      { type: 'good', text: '몸이 충분히 회전되었습니다' },
      { type: 'good', text: '체중이 왼발로 잘 이동되었습니다' },
    ],
    improvements: [
      {
        title: '균형 안정화',
        description: '피니시 자세에서 균형이 다소 불안정합니다. 안정적인 피니시는 일관된 스윙을 만듭니다.',
        tips: [
          '피니시 후 3초 이상 그 자세를 유지하는 연습',
          '왼발에 체중을 완전히 싣고 오른발은 토즈만 땅에 닿도록',
          '상체를 타겟 방향으로 완전히 돌려 정면을 향하도록',
        ],
      },
    ],
  },
}

export default function PhaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phaseId = parseInt(params.phaseId as string)
  const memberId = searchParams.get('memberId')
  const swingType = searchParams.get('swingType')

  const phase = phaseDetailData[phaseId]

  if (!phase) {
    return <div>Phase not found</div>
  }

  const handleBack = () => {
    router.push(`/analysis-result?memberId=${memberId}&swingType=${swingType}`)
  }

  const handlePrevious = () => {
    if (phaseId > 1) {
      router.push(`/analysis-result/${phaseId - 1}?memberId=${memberId}&swingType=${swingType}`)
    }
  }

  const handleNext = () => {
    if (phaseId < 8) {
      router.push(`/analysis-result/${phaseId + 1}?memberId=${memberId}&swingType=${swingType}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-chart-1'
      case 'warning':
        return 'text-chart-4'
      case 'error':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return (
          <Badge variant="default" className="bg-chart-1 hover:bg-chart-1">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            양호
          </Badge>
        )
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-chart-4 hover:bg-chart-4">
            <AlertTriangle className="mr-1 h-3 w-3" />
            주의
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            개선필요
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {phase.nameKo} ({phase.name})
                </h1>
                <p className="text-sm text-muted-foreground">단계 {phaseId} / 8</p>
              </div>
            </div>
            {getStatusBadge(phase.status)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Image and Description */}
          <div className="space-y-6">
            {/* Phase Image */}
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3]">
                <img
                  src={phase.image || "/placeholder.svg"}
                  alt={phase.nameKo}
                  className="h-full w-full object-cover"
                />
              </div>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  단계 설명
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{phase.description}</p>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={phaseId === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                이전 단계
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={phaseId === 8}
              >
                다음 단계
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Column - Analysis Data */}
          <div className="space-y-6">
            {/* Keypoints Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>주요 분석 항목</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(phase.keypoints).map(([key, data]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          data.status === 'good'
                            ? 'bg-chart-1'
                            : data.status === 'warning'
                            ? 'bg-chart-4'
                            : 'bg-destructive'
                        }`}
                      />
                      <span className="text-sm text-foreground">{data.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(data.status)}`}>
                      {data.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Positive Feedback */}
            {phase.feedback.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-chart-1">
                    <CheckCircle2 className="h-5 w-5" />
                    잘된 점
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {phase.feedback.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-chart-1 flex-shrink-0" />
                      <p className="text-sm text-foreground">{item.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Improvements */}
            {phase.improvements.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    개선 사항
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {phase.improvements.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-primary space-y-2">
                        <p className="text-sm font-medium text-foreground">개선 팁:</p>
                        {item.tips.map((tip: string, tipIdx: number) => (
                          <p key={tipIdx} className="text-sm text-muted-foreground">
                            • {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleBack}>
            전체 결과로 돌아가기
          </Button>
        </div>
      </main>
    </div>
  )
}
