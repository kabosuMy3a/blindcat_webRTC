import styles from 'styles/video.module.scss';
import {useRef} from "react";

const Video = () => {
  const localVideoRef = useRef(null) ;

  return (
    <div>
      <div className = {styles.layout}>
        <span><video className={styles.localVideo} ref={localVideoRef} muted/></span>
        <span><video className={styles.remoteVideo} muted/></span>
        <span><video className={styles.remoteVideo} muted/></span>
        <span><video className={styles.remoteVideo} muted/></span>
        <span><video className={styles.remoteVideo} muted/></span>
      </div>
    </div>
  ) ;

}

export { Video }