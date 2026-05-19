'use client';

import React, { useState } from 'react';
import { iconConfig } from '@/config/icons.config';
import { iconConfigDemo } from '@/config/icons.config.demo';
import * as Icons from '@/components/icons/AllIcons';
import * as IconsDemo from '@/components/icons/AllIconsDemo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IconPreviewPage() {
    const [selectedSize, setSelectedSize] = useState<keyof typeof iconConfig.sizes>('md');
    const [showComparison, setShowComparison] = useState(true);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold">🎨 Icon Design Preview</h1>
                            <p className="text-muted-foreground text-lg mt-2">
                                Preview new color scheme and icon designs before applying to main system
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowComparison(!showComparison)}
                            variant="outline"
                        >
                            {showComparison ? 'Show New Only' : 'Show Comparison'}
                        </Button>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ <strong>Preview Mode:</strong> These changes have NOT been applied to the main system yet.
                            Review and approve before implementation.
                        </p>
                    </div>
                </div>

                {/* Color Palette Comparison */}
                <Card className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Color Palette Comparison</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Current Colors */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Current Colors</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfig.colors.topikRed }} />
                                    <div className="text-xs">
                                        <div className="font-medium">topikRed</div>
                                        <div className="text-muted-foreground font-mono">{iconConfig.colors.topikRed}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfig.colors.darkNavy }} />
                                    <div className="text-xs">
                                        <div className="font-medium">darkNavy</div>
                                        <div className="text-muted-foreground font-mono">{iconConfig.colors.darkNavy}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* New Colors */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">✨ New Colors</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfigDemo.colors.darkNavy }} />
                                    <div className="text-xs">
                                        <div className="font-medium">darkNavy</div>
                                        <div className="text-muted-foreground font-mono">{iconConfigDemo.colors.darkNavy}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfigDemo.colors.topikRed }} />
                                    <div className="text-xs">
                                        <div className="font-medium">topikRed</div>
                                        <div className="text-muted-foreground font-mono">{iconConfigDemo.colors.topikRed}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfigDemo.colors.lightCream }} />
                                    <div className="text-xs">
                                        <div className="font-medium">lightCream</div>
                                        <div className="text-muted-foreground font-mono">{iconConfigDemo.colors.lightCream}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-lg border-2" style={{ backgroundColor: iconConfigDemo.colors.white }} />
                                    <div className="text-xs">
                                        <div className="font-medium">white</div>
                                        <div className="text-muted-foreground font-mono">{iconConfigDemo.colors.white}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Icon Comparison */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Icon Comparison</h2>
                        <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value as any)}
                            className="px-4 py-2 rounded-md border border-input bg-background"
                        >
                            {Object.keys(iconConfig.sizes).map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Tabs defaultValue="navigation" className="w-full">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="navigation">Navigation</TabsTrigger>
                            <TabsTrigger value="actions">Actions</TabsTrigger>
                            <TabsTrigger value="status">Status</TabsTrigger>
                            <TabsTrigger value="education">Education</TabsTrigger>
                            <TabsTrigger value="user">User</TabsTrigger>
                            <TabsTrigger value="media">Media</TabsTrigger>
                        </TabsList>

                        {/* Navigation Icons */}
                        <TabsContent value="navigation" className="space-y-4">
                            {[
                                { name: 'Home', Current: Icons.HomeIcon, New: IconsDemo.HomeIconDemo },
                                { name: 'Menu', Current: Icons.MenuIcon, New: IconsDemo.MenuIconDemo },
                                { name: 'Search', Current: Icons.SearchIcon, New: IconsDemo.SearchIconDemo },
                                { name: 'ArrowLeft', Current: Icons.ArrowLeftIcon, New: IconsDemo.ArrowLeftIconDemo },
                                { name: 'ArrowRight', Current: Icons.ArrowRightIcon, New: IconsDemo.ArrowRightIconDemo },
                                { name: 'Settings', Current: Icons.SettingsIcon, New: IconsDemo.SettingsIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        {/* Action Icons */}
                        <TabsContent value="actions" className="space-y-4">
                            {[
                                { name: 'Play', Current: Icons.PlayIcon, New: IconsDemo.PlayIconDemo },
                                { name: 'Pause', Current: Icons.PauseIcon, New: IconsDemo.PauseIconDemo },
                                { name: 'Record', Current: Icons.RecordIcon, New: IconsDemo.RecordIconDemo },
                                { name: 'Save', Current: Icons.SaveIcon, New: IconsDemo.SaveIconDemo },
                                { name: 'Delete', Current: Icons.DeleteIcon, New: IconsDemo.DeleteIconDemo },
                                { name: 'Edit', Current: Icons.EditIcon, New: IconsDemo.EditIconDemo },
                                { name: 'Add', Current: Icons.AddIcon, New: IconsDemo.AddIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        {/* Status Icons */}
                        <TabsContent value="status" className="space-y-4">
                            {[
                                { name: 'Success', Current: Icons.SuccessIcon, New: IconsDemo.SuccessIconDemo },
                                { name: 'Error', Current: Icons.ErrorIcon, New: IconsDemo.ErrorIconDemo },
                                { name: 'Warning', Current: Icons.WarningIcon, New: IconsDemo.WarningIconDemo },
                                { name: 'Info', Current: Icons.InfoIcon, New: IconsDemo.InfoIconDemo },
                                { name: 'Pending', Current: Icons.PendingIcon, New: IconsDemo.PendingIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        {/* Education Icons */}
                        <TabsContent value="education" className="space-y-4">
                            {[
                                { name: 'Speaking', Current: Icons.SpeakingIcon, New: IconsDemo.SpeakingIconDemo },
                                { name: 'Listening', Current: Icons.ListeningIcon, New: IconsDemo.ListeningIconDemo },
                                { name: 'Reading', Current: Icons.ReadingIcon, New: IconsDemo.ReadingIconDemo },
                                { name: 'Writing', Current: Icons.WritingIcon, New: IconsDemo.WritingIconDemo },
                                { name: 'TOPIK Level 1', Current: Icons.TopikLevel1Icon, New: IconsDemo.TopikLevel1IconDemo },
                                { name: 'TOPIK Level 2', Current: Icons.TopikLevel2Icon, New: IconsDemo.TopikLevel2IconDemo },
                                { name: 'TOPIK Level 3', Current: Icons.TopikLevel3Icon, New: IconsDemo.TopikLevel3IconDemo },
                                { name: 'TOPIK Level 4', Current: Icons.TopikLevel4Icon, New: IconsDemo.TopikLevel4IconDemo },
                                { name: 'TOPIK Level 5', Current: Icons.TopikLevel5Icon, New: IconsDemo.TopikLevel5IconDemo },
                                { name: 'TOPIK Level 6', Current: Icons.TopikLevel6Icon, New: IconsDemo.TopikLevel6IconDemo },
                                { name: 'Korean Flag', Current: Icons.KoreanFlagIcon, New: IconsDemo.KoreanFlagIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        {/* User Icons */}
                        <TabsContent value="user" className="space-y-4">
                            {[
                                { name: 'User', Current: Icons.UserIcon, New: IconsDemo.UserIconDemo },
                                { name: 'Login', Current: Icons.LoginIcon, New: IconsDemo.LoginIconDemo },
                                { name: 'Logout', Current: Icons.LogoutIcon, New: IconsDemo.LogoutIconDemo },
                                { name: 'Admin', Current: Icons.AdminIcon, New: IconsDemo.AdminIconDemo },
                                { name: 'Star Filled', Current: Icons.StarFilledIcon, New: IconsDemo.StarFilledIconDemo },
                                { name: 'Trophy', Current: Icons.TrophyIcon, New: IconsDemo.TrophyIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        {/* Media Icons */}
                        <TabsContent value="media" className="space-y-4">
                            {[
                                { name: 'Audio', Current: Icons.AudioIcon, New: IconsDemo.AudioIconDemo },
                                { name: 'Image', Current: Icons.ImageIcon, New: IconsDemo.ImageIconDemo },
                                { name: 'Video', Current: Icons.VideoIcon, New: IconsDemo.VideoIconDemo },
                                { name: 'File', Current: Icons.FileIcon, New: IconsDemo.FileIconDemo },
                                { name: 'Clock', Current: Icons.ClockIcon, New: IconsDemo.ClockIconDemo },
                                { name: 'Calendar', Current: Icons.CalendarIcon, New: IconsDemo.CalendarIconDemo },
                                { name: 'Star', Current: Icons.StarIcon, New: IconsDemo.StarIconDemo },
                            ].map(({ name, Current, New }) => (
                                <div key={name} className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    {showComparison && (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="text-sm font-medium text-muted-foreground">Current</div>
                                            <div className="p-6 rounded-lg bg-background">
                                                <Current size={selectedSize} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400">✨ New Design</div>
                                        <div className="p-6 rounded-lg bg-background border-2 border-green-200 dark:border-green-800">
                                            <New size={selectedSize} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">{name}</div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                </Card>

                {/* Action Buttons */}
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Ready to apply changes?</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Once approved, these changes will be applied to the entire application
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline">
                                Request Changes
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700">
                                Approve & Apply
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
