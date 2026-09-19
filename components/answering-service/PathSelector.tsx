'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User as UserIcon, Users as UsersIcon } from '@phosphor-icons/react'
interface PathSelectorProps {
  onSelect: (path: 'self_serve' | 'concierge') => void
}
export function PathSelector({ onSelect }: PathSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to Answering Service</h1>
        <p className="text-muted-foreground mt-2">
          How would you like to set up your account?
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect('self_serve')}
        >
          <CardHeader>
            <UserIcon className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Self-Serve Setup</CardTitle>
            <CardDescription>
              Configure your account yourself in about 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Fastest path to going live</li>
              <li>✓ AI coach available for questions</li>
              <li>✓ Modify anytime in your portal</li>
            </ul>
            <Button variant="default" className="w-full mt-4">Start Self-Serve Setup</Button>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect('concierge')}
        >
          <CardHeader>
            <UsersIcon className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Guided Onboarding</CardTitle>
            <CardDescription>
              Schedule a call with an onboarding specialist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Personalized setup assistance</li>
              <li>✓ Best for complex workflows</li>
              <li>✓ Recommended for Medical & Legal</li>
            </ul>
            <Button variant="outline" className="w-full mt-4">Schedule Call</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
