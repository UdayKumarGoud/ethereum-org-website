// Libraries
import React, { useEffect, useState, useMemo } from "react"
import {
  Box,
  ButtonGroup,
  Center,
  Circle,
  Container,
  Flex,
  Heading,
  Icon,
  Text,
  Spinner,
  useColorMode,
} from "@chakra-ui/react"
import { shuffle } from "lodash"
import { FaTwitter } from "react-icons/fa"

// Components
import Button from "../Button"
import QuizRadioGroup from "./QuizRadioGroup"
import QuizSummary from "./QuizSummary"
import Translation from "../Translation"

// SVG import
import Trophy from "../../assets/quiz/trophy.svg"
import Correct from "../../assets/quiz/correct.svg"
import Incorrect from "../../assets/quiz/incorrect.svg"
import StarConfetti from "../../assets/quiz/star-confetti.svg"

// Data
import allQuizData from "../../data/learnQuizzes"
import questionBank from "../../data/learnQuizzes/questionBank"

// Utilities
import { trackCustomEvent } from "../../utils/matomo"

// Type
import { AnswerChoice, RawQuiz, Quiz, RawQuestion, Question } from "../../types"

export interface IProps {
  quizKey?: string
  maxQuestions?: number
}
const QuizWidget: React.FC<IProps> = ({ quizKey, maxQuestions }) => {
  // TODO: Add loading state indicator and error handling
  const { colorMode } = useColorMode()
  const isDarkMode = colorMode === "dark"

  const [quizData, setQuizData] = useState<Quiz | null>(null)
  const [currentQuestionAnswerChoice, setCurrentQuestionAnswerChoice] =
    useState<AnswerChoice | null>(null)
  const [userQuizProgress, setUserQuizProgress] = useState<Array<AnswerChoice>>(
    []
  )
  const [showAnswer, setShowAnswer] = useState<boolean>(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const initialize = () => {
    // Reset state
    setQuizData(null)
    setCurrentQuestionAnswerChoice(null)
    setUserQuizProgress([])
    setShowAnswer(false)
    setSelectedAnswer(null)

    // Get quiz key
    const currentQuizKey =
      quizKey ||
      Object.keys(allQuizData).filter((quizUri) =>
        window?.location.href.includes(quizUri)
      )[0] ||
      null

    // Get quiz data, shuffle, then truncate if necessary
    if (currentQuizKey) {
      const rawQuiz: RawQuiz = allQuizData[currentQuizKey]
      const questions: Array<Question> = rawQuiz.questions.map((id) => {
        const rawQuestion: RawQuestion = questionBank[id]
        return { id, ...rawQuestion }
      })
      const shuffledQuestions = shuffle(questions)
      const trimmedQuestions = maxQuestions
        ? shuffledQuestions.slice(0, maxQuestions)
        : shuffledQuestions
      const quiz: Quiz = { title: rawQuiz.title, questions: trimmedQuestions }
      setQuizData(quiz)
    } else {
      setQuizData(null)
    }
  }
  useEffect(initialize, [quizKey])

  // Memoized values
  const currentQuestionIndex = useMemo<number>(
    () => userQuizProgress.length || 0,
    [userQuizProgress]
  )

  // TODO: Allow user to submit quiz for storage
  const showResults = useMemo<boolean>(
    () => userQuizProgress.length === quizData?.questions.length,
    [userQuizProgress, quizData]
  )

  const cardBackground = useMemo<string>(() => {
    if (showAnswer) {
      if (currentQuestionAnswerChoice?.isCorrect)
        return isDarkMode ? "#0A160E" : "#C8F7D8"
      return isDarkMode ? "#1B0C0C" : "#F7C8C8"
    }
    return isDarkMode ? "gray.900" : "white"
  }, [isDarkMode, showAnswer])

  const correctCount = useMemo<number>(
    () => userQuizProgress.filter(({ isCorrect }) => isCorrect).length,
    [userQuizProgress]
  )

  // Handlers
  const handleSelectAnswerChoice = (answerId: string): void => {
    const isCorrect =
      answerId === quizData?.questions[currentQuestionIndex].correctAnswerId
    setCurrentQuestionAnswerChoice({ answerId, isCorrect })
  }

  // TODO: Confirm both handleSelectAnswerChoice & handleSelection are necessary
  const handleSelection = (answerId: string): void => {
    setSelectedAnswer(answerId)
    handleSelectAnswerChoice(answerId)
  }

  const handleShowAnswer = (questionId: string, answer: AnswerChoice): void => {
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Question answered",
      eventName: `QID: ${questionId}`,
      eventValue: answer.isCorrect
        ? `Correct answer`
        : `AID: ${answer.answerId}`,
    })
    setShowAnswer(true)
  }

  const handleRetryQuestion = (): void => {
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Other",
      eventName: "Retry question",
    })
    setCurrentQuestionAnswerChoice(null)
    setSelectedAnswer(null)
    setShowAnswer(false)
  }
  const handleContinue = (): void => {
    if (!currentQuestionAnswerChoice) return
    setUserQuizProgress((prev) => [...prev, currentQuestionAnswerChoice])
    setCurrentQuestionAnswerChoice(null)
    setShowAnswer(false)
    if (showResults) {
      const ratioCorrect: number =
        correctCount / quizData!.questions.length || 0
      trackCustomEvent({
        eventCategory: "Quiz widget",
        eventAction: "Other",
        eventName: "Submit results",
        eventValue: `${Math.floor(ratioCorrect * 100)}%`,
      })
    }
  }
  const shareTweetHandler = (): void => {
    if (!quizData || !window) return
    trackCustomEvent({
      eventCategory: "Quiz widget",
      eventAction: "Other",
      eventName: "Share results",
    })
    const url = `https://ethereum.org${window.location.pathname}` // TODO: Add hash link to quiz
    const tweet = `I just took the "${quizData.title}" quiz on ethereum.org and scored ${correctCount} out of ${quizData.questions.length}! Try it yourself at ${url}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURI(
        tweet
      )}&hashtags=${"ethereumknowledge"}`
    )
  }

  return (
    <Flex width="full" direction="column" alignItems="center">
      <Heading as="h2" mb={12} id="quiz">
        <Translation id="quiz-test-your-knowledge" />
      </Heading>
      <Box
        w={{
          md: "600px",
          sm: "300px",
        }}
        bg={cardBackground}
        borderRadius="base"
        boxShadow="dropShadow"
        padding={{
          md: "49px 62px", // TODO: Remove magic numbers
          base: "20px 30px",
        }}
        position="relative"
      >
        {/* Trophy icon */}
        <Circle
          size="50px"
          bg={
            !showAnswer
              ? "primary"
              : currentQuestionAnswerChoice?.isCorrect
              ? "#48BB78"
              : "#B80000"
          }
          position="absolute"
          top={0}
          left="50%"
          transform="translateX(-50%) translateY(-50%)"
        >
          <Icon
            as={
              !showAnswer
                ? Trophy
                : currentQuestionAnswerChoice?.isCorrect
                ? Correct
                : Incorrect
            }
            fontSize="1.75rem"
            color="background"
          />
        </Circle>
        {quizData &&
          showResults &&
          Math.floor((correctCount / quizData.questions.length) * 100) > 65 && (
            <>
              <Icon
                as={StarConfetti}
                fontSize="184px"
                position="absolute"
                left={0}
                top={-8}
              />
              <Icon
                as={StarConfetti}
                fontSize="184px"
                position="absolute"
                right={0}
                top={-8}
                transform="scaleX(-100%)"
              />
            </>
          )}
        {quizData ? (
          <>
            <Center>
              <Text
                fontStyle={"normal"}
                fontWeight={"700"}
                color={isDarkMode ? "orange.300" : "blue.300"}
              >
                {quizData.title}
              </Text>
            </Center>
            <Center gap={1} marginBottom={6}>
              {quizData.questions.map(({ id }, index) => {
                let bg: string
                if (
                  (showAnswer &&
                    index === currentQuestionIndex &&
                    currentQuestionAnswerChoice?.isCorrect) ||
                  userQuizProgress[index]?.isCorrect
                ) {
                  bg = "success"
                } else if (
                  (showAnswer &&
                    index === currentQuestionIndex &&
                    !currentQuestionAnswerChoice?.isCorrect) ||
                  (userQuizProgress[index] &&
                    !userQuizProgress[index].isCorrect)
                ) {
                  bg = "error"
                } else if (index === currentQuestionIndex) {
                  bg = "gray.400"
                } else {
                  bg = "gray.500"
                }
                return (
                  <Container
                    key={id}
                    bg={bg}
                    h="4px"
                    maxW="2rem"
                    width="full"
                    marginInline={0}
                  />
                )
              })}
            </Center>
            <Center>
              {showResults ? (
                <QuizSummary
                  correctCount={correctCount}
                  questionCount={quizData.questions.length}
                />
              ) : (
                <QuizRadioGroup
                  questionData={quizData.questions[currentQuestionIndex]}
                  showAnswer={showAnswer}
                  handleSelection={handleSelection}
                  selectedAnswer={selectedAnswer}
                />
              )}
            </Center>
            <Center mt={8}>
              <ButtonGroup gap={6}>
                {showAnswer &&
                  currentQuestionAnswerChoice &&
                  !currentQuestionAnswerChoice.isCorrect && (
                    <Button
                      onClick={handleRetryQuestion}
                      variant={"outline-color"}
                    >
                      Try again
                    </Button>
                  )}
                {showResults ? (
                  <Flex gap={6}>
                    <Button
                      leftIcon={<Icon as={FaTwitter} />}
                      onClick={shareTweetHandler}
                    >
                      Share results
                    </Button>
                    <Button onClick={initialize}>Take quiz again</Button>
                  </Flex>
                ) : showAnswer ? (
                  <Button onClick={handleContinue}>
                    {userQuizProgress.length === quizData.questions.length - 1
                      ? "See results"
                      : "Next question"}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      handleShowAnswer(
                        quizData.questions[currentQuestionIndex].id,
                        currentQuestionAnswerChoice!
                      )
                    }
                    disabled={!currentQuestionAnswerChoice}
                  >
                    Submit answer
                  </Button>
                )}
              </ButtonGroup>
            </Center>
          </>
        ) : (
          <Flex justify="center">
            <Spinner />
          </Flex>
        )}
      </Box>
    </Flex>
  )
}

export default QuizWidget
