"use client";

import { useEffect, useState } from "react";
import { IssueSeverityLevelBadge } from "@components/system/issue-severity-level-badge";
import { Badge } from "@components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card";
import { Heading } from "@components/ui/heading";
import type { LibraryRule } from "@services/kodyRules/types";
import { sendRuleFeedback, type FeedbackType } from "@services/ruleFeedback/fetch";
import { useMutation } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { ProgrammingLanguage } from "src/core/enums/programming-language";
import { useAuth } from "src/core/providers/auth.provider";
import { cn } from "src/core/utils/components";
import { addSearchParamsToUrl } from "src/core/utils/url";

import { Button } from "../button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";
import { Link } from "../link";
import { Separator } from "../separator";
import { Spinner } from "../spinner";

export const KodyRuleLibraryItem = ({
    rule,
    repositoryId,
    directoryId,
    showLikeButton,
}: {
    rule: LibraryRule;
    repositoryId?: string;
    directoryId?: string;
    showLikeButton?: boolean;
}) => {
    const { userId } = useAuth();
    const [positiveCount, setPositiveCount] = useState(rule.positiveCount ?? 0);
    const [negativeCount, setNegativeCount] = useState(rule.negativeCount ?? 0);
    const [userFeedback, setUserFeedback] = useState<FeedbackType | null>(
        rule.userFeedback as FeedbackType | null
    );

    useEffect(() => {
        setPositiveCount(rule.positiveCount ?? 0);
        setNegativeCount(rule.negativeCount ?? 0);
        setUserFeedback(rule.userFeedback as FeedbackType | null);
    }, [rule.positiveCount, rule.negativeCount, rule.userFeedback]);

    const sortedTags = [...rule.tags.sort((a, b) => a.length - b.length)];

    const quantityOfCharactersInAllTags = sortedTags.reduce(
        (acc, item) => acc + item.length,
        0,
    );

    const { tagsToShow, tagsToHide } = sortedTags.reduce(
        (acc, item, _i, arr) => {
            if (arr.length <= 4 && quantityOfCharactersInAllTags <= 35) {
                acc.tagsToShow.push(item);
                return acc;
            }

            if (acc.charactersCount + item.length <= 30) {
                acc.charactersCount += item.length;
                acc.tagsToShow.push(item);
                return acc;
            }

            acc.tagsToHide.push(item);
            return acc;
        },
        {
            tagsToShow: [] as string[],
            tagsToHide: [] as string[],
            charactersCount: rule.language?.length ?? 0,
        },
    );

    const { mutate: sendFeedback, isPending: isFeedbackActionInProgress } =
        useMutation<any, Error, FeedbackType>({
            mutationFn: async (feedback: FeedbackType) => {
                return sendRuleFeedback(rule.uuid, feedback);
            },
            onSuccess: (data, feedback) => {
                // Update local state optimistically
                if (feedback === "positive") {
                    setPositiveCount(prev => userFeedback === "positive" ? prev : prev + 1);
                    setNegativeCount(prev => userFeedback === "negative" ? prev - 1 : prev);
                } else {
                    setNegativeCount(prev => userFeedback === "negative" ? prev : prev + 1);
                    setPositiveCount(prev => userFeedback === "positive" ? prev - 1 : prev);
                }
                setUserFeedback(userFeedback === feedback ? null : feedback);
            },
            onError: (error) => {
                console.error("Error sending feedback:", error);
            },
        });

    const href = addSearchParamsToUrl(`/library/kody-rules/${rule.uuid}`, {
        repositoryId,
        directoryId,
    });

    return (
        <Card
            key={rule.uuid}
            className="flex w-full cursor-default flex-col items-start overflow-visible bg-transparent">
            <Link className="w-full flex-1" href={href}>
                <Button
                    size="lg"
                    decorative
                    variant="helper"
                    className="h-full w-full flex-col gap-0 rounded-b-none px-0 py-0">
                    <CardHeader className="flex-row justify-between gap-4">
                        <Heading
                            variant="h3"
                            className="line-clamp-2 flex min-h-6 items-center font-semibold">
                            {rule.title}
                        </Heading>

                        {!!rule.severity && (
                            <IssueSeverityLevelBadge
                                severity={
                                    rule.severity.toLowerCase() as Lowercase<
                                        typeof rule.severity
                                    >
                                }
                            />
                        )}
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col">
                        <p className="text-text-secondary line-clamp-3 text-[13px]">
                            {rule.rule}
                        </p>
                    </CardContent>
                </Button>
            </Link>

            <Separator className="opacity-70" />

            <CardFooter className="bg-card-lv2 flex w-full cursor-auto items-end justify-between gap-4 rounded-b-xl px-5 py-4">
                <div className="flex flex-wrap items-center gap-[3px]">
                    {rule.language && (
                        <Badge className="pointer-events-none h-2 px-2.5 font-normal">
                            {ProgrammingLanguage[rule.language]}
                        </Badge>
                    )}

                    {tagsToShow.map((tag) => (
                        <Badge
                            key={tag}
                            className="pointer-events-none h-2 px-2.5 font-normal">
                            {tag}
                        </Badge>
                    ))}

                    {tagsToHide.length > 0 && (
                        <HoverCard openDelay={0} closeDelay={100}>
                            <HoverCardTrigger asChild>
                                <Button
                                    size="xs"
                                    variant="cancel"
                                    className="-ml-1 h-2 px-2">
                                    + {tagsToHide.length}
                                </Button>
                            </HoverCardTrigger>

                            <HoverCardContent className="flex flex-wrap gap-1">
                                {tagsToHide.map((tag) => (
                                    <Badge
                                        key={tag}
                                        className="pointer-events-none h-2 px-2.5 font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                            </HoverCardContent>
                        </HoverCard>
                    )}
                </div>

                {showLikeButton && (
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="cancel"
                            onClick={() => sendFeedback("positive")}
                            disabled={isFeedbackActionInProgress}
                            className={cn(
                                "-my-2 gap-1 px-2 transition-colors",
                                userFeedback === "positive" && "bg-green-500/10 text-green-500 border-green-500/20"
                            )}
                            rightIcon={
                                isFeedbackActionInProgress ? (
                                    <Spinner className="size-2.5" />
                                ) : (
                                    <ThumbsUp className="size-3" />
                                )
                            }>
                            {positiveCount > 0 ? positiveCount : null}
                        </Button>
                        
                        <Button
                            size="sm"
                            variant="cancel"
                            onClick={() => sendFeedback("negative")}
                            disabled={isFeedbackActionInProgress}
                            className={cn(
                                "-my-2 gap-1 px-2 transition-colors",
                                userFeedback === "negative" && "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                            rightIcon={
                                isFeedbackActionInProgress ? (
                                    <Spinner className="size-2.5" />
                                ) : (
                                    <ThumbsDown className="size-3" />
                                )
                            }>
                            {negativeCount > 0 ? negativeCount : null}
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};
